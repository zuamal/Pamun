"""Tests for requirement management: PATCH, DELETE, merge, split."""
from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.document import Document, DocumentFormat
from app.models.edge import Edge, EdgeStatus, RelationType
from app.models.requirement import Requirement, RequirementLocation
from app.storage.store import store

# ---------------------------------------------------------------------------
# Raw text for fixtures (exact spans matter for merge/split tests)
# ---------------------------------------------------------------------------
RAW_TEXT = "Users must log in.\nSystem sends OTP.\nDashboard loads data."
#            0               19  20              36  37               56
_REQ1_TEXT = "Users must log in."
_REQ2_TEXT = "System sends OTP."
_REQ3_TEXT = "Dashboard loads data."

_R1_START = 0
_R1_END = len(_REQ1_TEXT)                        # 18
_R2_START = _R1_END + 1                          # 19  (after \n)
_R2_END = _R2_START + len(_REQ2_TEXT)            # 36
_R3_START = _R2_END + 1                          # 37  (after \n)
_R3_END = _R3_START + len(_REQ3_TEXT)            # 58

assert RAW_TEXT[_R1_START:_R1_END] == _REQ1_TEXT
assert RAW_TEXT[_R2_START:_R2_END] == _REQ2_TEXT
assert RAW_TEXT[_R3_START:_R3_END] == _REQ3_TEXT


@pytest.fixture(autouse=True)
def reset_store() -> None:
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def doc() -> Document:
    d = Document(
        id="doc-1",
        filename="spec.md",
        format=DocumentFormat.MARKDOWN,
        raw_text=RAW_TEXT,
        file_size=len(RAW_TEXT.encode()),
        uploaded_at=datetime.now(),
    )
    store.documents[d.id] = d
    return d


def _make_req(req_id: str, text: str, start: int, end: int, doc_id: str = "doc-1") -> Requirement:
    r = Requirement(
        id=req_id,
        title=f"Title {req_id}",
        original_text=text,
        location=RequirementLocation(document_id=doc_id, char_start=start, char_end=end),
        display_label=f"Label {req_id}",
    )
    store.requirements[req_id] = r
    return r


def _make_edge(eid: str, src: str, tgt: str) -> Edge:
    e = Edge(
        id=eid,
        source_id=src,
        target_id=tgt,
        relation_type=RelationType.DEPENDS_ON,
        evidence="test",
        confidence=0.9,
        status=EdgeStatus.APPROVED,
    )
    store.edges[eid] = e
    store.graph.add_edge(src, tgt, edge_id=eid)
    return e


# ── PATCH ─────────────────────────────────────────────────────────────────────

def test_patch_title(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    resp = client.patch("/api/requirements/req-1", json={"title": "New Title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"
    assert store.requirements["req-1"].title == "New Title"


def test_patch_changed_flag(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    resp = client.patch("/api/requirements/req-1", json={"changed": True})
    assert resp.status_code == 200
    assert resp.json()["changed"] is True


def test_patch_both_fields(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    resp = client.patch("/api/requirements/req-1", json={"title": "T", "changed": True})
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "T"
    assert data["changed"] is True


def test_patch_both_null_returns_422(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    resp = client.patch("/api/requirements/req-1", json={})
    assert resp.status_code == 422


def test_patch_not_found(client: TestClient) -> None:
    resp = client.patch("/api/requirements/nonexistent", json={"title": "X"})
    assert resp.status_code == 404


# ── DELETE ────────────────────────────────────────────────────────────────────

def test_delete_requirement(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    resp = client.delete("/api/requirements/req-1")
    assert resp.status_code == 204
    assert "req-1" not in store.requirements


def test_delete_removes_connected_edges(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    _make_req("req-2", _REQ2_TEXT, _R2_START, _R2_END)
    _make_edge("edge-1", "req-1", "req-2")
    _make_edge("edge-2", "req-2", "req-1")

    client.delete("/api/requirements/req-1")

    assert "edge-1" not in store.edges
    assert "edge-2" not in store.edges


def test_delete_not_found(client: TestClient) -> None:
    resp = client.delete("/api/requirements/nonexistent")
    assert resp.status_code == 404


# ── MERGE ─────────────────────────────────────────────────────────────────────

def test_merge_two_adjacent_requirements(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    _make_req("req-2", _REQ2_TEXT, _R2_START, _R2_END)

    resp = client.post(
        "/api/requirements/merge",
        json={"requirement_ids": ["req-1", "req-2"]},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["location"]["char_start"] == _R1_START
    assert data["location"]["char_end"] == _R2_END
    assert "req-1" not in store.requirements
    assert "req-2" not in store.requirements
    assert data["id"] in store.requirements


def test_merge_relinks_edges(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    _make_req("req-2", _REQ2_TEXT, _R2_START, _R2_END)
    _make_req("req-3", _REQ3_TEXT, _R3_START, _R3_END)
    _make_edge("edge-1", "req-1", "req-3")

    resp = client.post(
        "/api/requirements/merge",
        json={"requirement_ids": ["req-1", "req-2"]},
    )
    merged_id = resp.json()["id"]

    # Edge should now point from merged_id to req-3
    relinked = [e for e in store.edges.values() if e.source_id == merged_id]
    assert len(relinked) == 1
    assert relinked[0].target_id == "req-3"


def test_merge_different_documents_fails(client: TestClient, doc: Document) -> None:
    doc2 = Document(
        id="doc-2",
        filename="other.md",
        format=DocumentFormat.MARKDOWN,
        raw_text="Other text",
        file_size=10,
        uploaded_at=datetime.now(),
    )
    store.documents["doc-2"] = doc2

    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END, doc_id="doc-1")
    _make_req("req-x", "Other text", 0, 10, doc_id="doc-2")

    resp = client.post(
        "/api/requirements/merge",
        json={"requirement_ids": ["req-1", "req-x"]},
    )
    assert resp.status_code == 422


def test_merge_non_adjacent_fails(client: TestClient, doc: Document) -> None:
    # req-1 and req-3 are not adjacent (req-2 is in between)
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    _make_req("req-3", _REQ3_TEXT, _R3_START, _R3_END)

    resp = client.post(
        "/api/requirements/merge",
        json={"requirement_ids": ["req-1", "req-3"]},
    )
    assert resp.status_code == 422


# ── SPLIT ─────────────────────────────────────────────────────────────────────

def test_split_requirement(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    offset = 5  # "Users" | " must log in."

    resp = client.post(
        "/api/requirements/split",
        json={"requirement_id": "req-1", "split_offset": offset},
    )
    assert resp.status_code == 201
    parts = resp.json()
    assert len(parts) == 2
    assert parts[0]["original_text"] == _REQ1_TEXT[:offset]
    assert parts[1]["original_text"] == _REQ1_TEXT[offset:]
    assert "req-1" not in store.requirements


def test_split_edges_go_to_first_part(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    _make_req("req-2", _REQ2_TEXT, _R2_START, _R2_END)
    _make_edge("edge-1", "req-1", "req-2")

    resp = client.post(
        "/api/requirements/split",
        json={"requirement_id": "req-1", "split_offset": 5},
    )
    part1_id = resp.json()[0]["id"]

    relinked = [e for e in store.edges.values() if e.source_id == part1_id]
    assert len(relinked) == 1


def test_split_offset_zero_fails(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    resp = client.post(
        "/api/requirements/split",
        json={"requirement_id": "req-1", "split_offset": 0},
    )
    assert resp.status_code == 422


def test_split_offset_at_end_fails(client: TestClient, doc: Document) -> None:
    _make_req("req-1", _REQ1_TEXT, _R1_START, _R1_END)
    resp = client.post(
        "/api/requirements/split",
        json={"requirement_id": "req-1", "split_offset": len(_REQ1_TEXT)},
    )
    assert resp.status_code == 422


def test_split_not_found(client: TestClient) -> None:
    resp = client.post(
        "/api/requirements/split",
        json={"requirement_id": "nonexistent", "split_offset": 5},
    )
    assert resp.status_code == 404
