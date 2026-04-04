"""Tests for GET /api/impact — 1-hop impact analysis."""
from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.document import Document, DocumentFormat
from app.models.edge import Edge, EdgeStatus, RelationType
from app.models.impact import ImpactLevel
from app.models.requirement import Requirement, RequirementLocation
from app.storage.store import store


@pytest.fixture(autouse=True)
def reset_store() -> None:
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _doc(doc_id: str = "doc-1", filename: str = "spec.md") -> Document:
    d = Document(
        id=doc_id,
        filename=filename,
        format=DocumentFormat.MARKDOWN,
        raw_text="text",
        uploaded_at=datetime.now(),
    )
    store.documents[doc_id] = d
    return d


def _req(req_id: str, changed: bool = False, doc_id: str = "doc-1") -> Requirement:
    r = Requirement(
        id=req_id,
        title=f"Title {req_id}",
        original_text="text",
        location=RequirementLocation(document_id=doc_id, char_start=0, char_end=4),
        display_label=f"Label {req_id}",
        changed=changed,
    )
    store.requirements[req_id] = r
    return r


def _edge(
    eid: str,
    src: str,
    tgt: str,
    relation_type: RelationType = RelationType.DEPENDS_ON,
    status: EdgeStatus = EdgeStatus.APPROVED,
    evidence: str = "evidence",
) -> Edge:
    e = Edge(
        id=eid,
        source_id=src,
        target_id=tgt,
        relation_type=relation_type,
        evidence=evidence,
        confidence=0.9,
        status=status,
    )
    store.edges[eid] = e
    if status == EdgeStatus.APPROVED:
        store.graph.add_edge(src, tgt, edge_id=eid)
    return e


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_no_changed_requirements_returns_empty(client: TestClient) -> None:
    _doc()
    _req("req-1")
    _req("req-2")
    _edge("e1", "req-1", "req-2")

    resp = client.get("/api/impact")
    assert resp.status_code == 200
    result = resp.json()["result"]
    assert result["affected_items"] == []
    assert result["review_items"] == []
    assert result["total_affected"] == 0
    assert result["total_review"] == 0


def test_depends_on_target_changed_source_is_affected(client: TestClient) -> None:
    """target changed → source is AFFECTED."""
    _doc()
    _req("req-src")
    _req("req-tgt", changed=True)
    _edge("e1", "req-src", "req-tgt", RelationType.DEPENDS_ON)

    result = client.get("/api/impact").json()["result"]

    assert len(result["affected_items"]) == 1
    assert result["affected_items"][0]["requirement_id"] == "req-src"
    assert result["affected_items"][0]["impact_level"] == "affected"
    assert result["review_items"] == []


def test_depends_on_source_changed_target_is_review(client: TestClient) -> None:
    """source changed → target is REVIEW_RECOMMENDED."""
    _doc()
    _req("req-src", changed=True)
    _req("req-tgt")
    _edge("e1", "req-src", "req-tgt", RelationType.DEPENDS_ON)

    result = client.get("/api/impact").json()["result"]

    assert result["affected_items"] == []
    assert len(result["review_items"]) == 1
    assert result["review_items"][0]["requirement_id"] == "req-tgt"
    assert result["review_items"][0]["impact_level"] == "review_recommended"


def test_related_to_source_changed_target_affected(client: TestClient) -> None:
    _doc()
    _req("req-a", changed=True)
    _req("req-b")
    _edge("e1", "req-a", "req-b", RelationType.RELATED_TO)

    result = client.get("/api/impact").json()["result"]

    assert len(result["affected_items"]) == 1
    assert result["affected_items"][0]["requirement_id"] == "req-b"


def test_related_to_target_changed_source_affected(client: TestClient) -> None:
    _doc()
    _req("req-a")
    _req("req-b", changed=True)
    _edge("e1", "req-a", "req-b", RelationType.RELATED_TO)

    result = client.get("/api/impact").json()["result"]

    assert len(result["affected_items"]) == 1
    assert result["affected_items"][0]["requirement_id"] == "req-a"


def test_pending_edge_not_included(client: TestClient) -> None:
    """PENDING edges must not affect impact analysis."""
    _doc()
    _req("req-src")
    _req("req-tgt", changed=True)
    _edge("e1", "req-src", "req-tgt", RelationType.DEPENDS_ON, status=EdgeStatus.PENDING)

    result = client.get("/api/impact").json()["result"]

    assert result["affected_items"] == []
    assert result["review_items"] == []


def test_rejected_edge_not_included(client: TestClient) -> None:
    _doc()
    _req("req-src")
    _req("req-tgt", changed=True)
    _edge("e1", "req-src", "req-tgt", RelationType.DEPENDS_ON, status=EdgeStatus.REJECTED)

    result = client.get("/api/impact").json()["result"]
    assert result["affected_items"] == []


def test_changed_req_not_in_result(client: TestClient) -> None:
    """changed=True requirements should not appear in affected or review."""
    _doc()
    _req("req-a", changed=True)
    _req("req-b", changed=True)
    _edge("e1", "req-a", "req-b", RelationType.RELATED_TO)

    result = client.get("/api/impact").json()["result"]
    all_ids = [i["requirement_id"] for i in result["affected_items"] + result["review_items"]]
    assert "req-a" not in all_ids
    assert "req-b" not in all_ids


def test_dedup_affected_wins_over_review(client: TestClient) -> None:
    """If same req appears as both affected and review_recommended, affected wins."""
    _doc()
    # req-target is impacted by two changed nodes via different edges
    # Via req-a (depends_on, source=req-a changed): req-target → review_recommended
    # Via req-b (depends_on, target=req-target... wait let me think differently)
    # req-middle is the overlapping node
    _req("req-src-a", changed=True)   # source changed → target review_recommended
    _req("req-src-b", changed=True)   # this is the target of an edge → source affected
    _req("req-middle")

    # edge1: req-src-a → req-middle (depends_on, source changed → middle is review_recommended)
    _edge("e1", "req-src-a", "req-middle", RelationType.DEPENDS_ON)
    # edge2: req-middle → req-src-b (depends_on, target=req-src-b changed → middle is affected)
    _edge("e2", "req-middle", "req-src-b", RelationType.DEPENDS_ON)

    result = client.get("/api/impact").json()["result"]

    # req-middle should appear exactly once with impact_level=affected
    all_items = result["affected_items"] + result["review_items"]
    middle_items = [i for i in all_items if i["requirement_id"] == "req-middle"]
    assert len(middle_items) == 1
    assert middle_items[0]["impact_level"] == "affected"


def test_impact_item_fields_complete(client: TestClient) -> None:
    """ImpactItem must have document_filename, display_label, evidence, char offsets."""
    _doc(doc_id="doc-1", filename="my_spec.md")
    _req("req-src")
    _req("req-tgt", changed=True)
    _edge("e1", "req-src", "req-tgt", RelationType.DEPENDS_ON, evidence="req-src depends on req-tgt")

    result = client.get("/api/impact").json()["result"]
    item = result["affected_items"][0]

    assert item["document_filename"] == "my_spec.md"
    assert item["display_label"] == "Label req-src"
    assert item["evidence"] == "req-src depends on req-tgt"
    assert "char_start" in item
    assert "char_end" in item


def test_total_counts_match_list_lengths(client: TestClient) -> None:
    _doc()
    _req("req-a", changed=True)
    _req("req-b")
    _req("req-c")
    _edge("e1", "req-b", "req-a", RelationType.DEPENDS_ON)  # tgt=req-a changed → req-b affected
    _edge("e2", "req-a", "req-c", RelationType.DEPENDS_ON)  # src=req-a changed → req-c review

    result = client.get("/api/impact").json()["result"]
    assert result["total_affected"] == len(result["affected_items"])
    assert result["total_review"] == len(result["review_items"])
