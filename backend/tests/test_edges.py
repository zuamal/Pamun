"""Tests for edge inference and management endpoints."""
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
# Helpers
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_store() -> None:
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _make_req(req_id: str) -> Requirement:
    r = Requirement(
        id=req_id,
        title=f"Req {req_id}",
        original_text=f"Text for {req_id}",
        location=RequirementLocation(document_id="doc-1", char_start=0, char_end=10),
        display_label="Section 1",
    )
    store.requirements[req_id] = r
    return r


def _make_edge(
    eid: str,
    src: str,
    tgt: str,
    status: EdgeStatus = EdgeStatus.PENDING,
) -> Edge:
    e = Edge(
        id=eid,
        source_id=src,
        target_id=tgt,
        relation_type=RelationType.DEPENDS_ON,
        evidence="test evidence",
        confidence=0.9,
        status=status,
    )
    store.edges[eid] = e
    if status == EdgeStatus.APPROVED:
        store.graph.add_edge(src, tgt, edge_id=eid)
    return e


MOCK_INFERRED_EDGES = [
    Edge(
        id="edge-inf-1",
        source_id="req-1",
        target_id="req-2",
        relation_type=RelationType.DEPENDS_ON,
        evidence="req-1 depends on req-2",
        confidence=0.85,
        status=EdgeStatus.PENDING,
    )
]


# ── POST /api/edges/infer ────────────────────────────────────────────────────

def test_infer_success(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")

    with __import__("unittest.mock", fromlist=["patch"]).patch(
        "app.services.edge_service.infer_edges",
        return_value=MOCK_INFERRED_EDGES,
    ):
        resp = client.post("/api/edges/infer", json={"requirement_ids": None})

    assert resp.status_code == 201
    edges = resp.json()
    assert len(edges) == 1
    assert edges[0]["status"] == "pending"


def test_infer_stores_edges(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")

    with __import__("unittest.mock", fromlist=["patch"]).patch(
        "app.services.edge_service.infer_edges",
        return_value=MOCK_INFERRED_EDGES,
    ):
        client.post("/api/edges/infer", json={"requirement_ids": None})

    assert len(store.edges) == 1
    # PENDING edges should NOT be in graph
    assert not store.graph.has_edge("req-1", "req-2")


def test_infer_skips_duplicates(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")
    # Pre-existing edge with same source-target
    _make_edge("existing", "req-1", "req-2")

    with __import__("unittest.mock", fromlist=["patch"]).patch(
        "app.services.edge_service.infer_edges",
        return_value=MOCK_INFERRED_EDGES,
    ):
        resp = client.post("/api/edges/infer", json={"requirement_ids": None})

    assert resp.status_code == 201
    assert resp.json() == []  # duplicate skipped
    assert len(store.edges) == 1  # only the original


def test_infer_no_requirements_returns_422(client: TestClient) -> None:
    resp = client.post("/api/edges/infer", json={"requirement_ids": None})
    assert resp.status_code == 422


def test_infer_filtered_by_ids(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")

    with __import__("unittest.mock", fromlist=["patch"]).patch(
        "app.services.edge_service.infer_edges",
        return_value=MOCK_INFERRED_EDGES,
    ) as mock_infer:
        client.post("/api/edges/infer", json={"requirement_ids": ["req-1"]})
        called_reqs = mock_infer.call_args[0][0]
        assert len(called_reqs) == 1
        assert called_reqs[0].id == "req-1"


# ── GET /api/edges ───────────────────────────────────────────────────────────

def test_list_edges_empty(client: TestClient) -> None:
    resp = client.get("/api/edges")
    assert resp.status_code == 200
    assert resp.json() == {"edges": []}


def test_list_edges_all(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")
    _make_edge("e1", "req-1", "req-2", EdgeStatus.PENDING)

    resp = client.get("/api/edges")
    assert resp.status_code == 200
    assert len(resp.json()["edges"]) == 1


def test_list_edges_filter_by_status(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")
    _make_req("req-3")
    _make_edge("e1", "req-1", "req-2", EdgeStatus.PENDING)
    _make_edge("e2", "req-2", "req-3", EdgeStatus.APPROVED)

    resp = client.get("/api/edges?status=pending")
    assert resp.status_code == 200
    assert len(resp.json()["edges"]) == 1
    assert resp.json()["edges"][0]["status"] == "pending"


# ── POST /api/edges ──────────────────────────────────────────────────────────

def test_manual_create_edge(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")

    resp = client.post(
        "/api/edges",
        json={
            "source_id": "req-1",
            "target_id": "req-2",
            "relation_type": "depends_on",
            "evidence": "req-1 needs req-2",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "approved"
    assert store.graph.has_edge("req-1", "req-2")


def test_manual_create_edge_bad_source(client: TestClient) -> None:
    _make_req("req-2")
    resp = client.post(
        "/api/edges",
        json={
            "source_id": "nonexistent",
            "target_id": "req-2",
            "relation_type": "depends_on",
            "evidence": "x",
        },
    )
    assert resp.status_code == 422


def test_manual_create_edge_bad_target(client: TestClient) -> None:
    _make_req("req-1")
    resp = client.post(
        "/api/edges",
        json={
            "source_id": "req-1",
            "target_id": "nonexistent",
            "relation_type": "depends_on",
            "evidence": "x",
        },
    )
    assert resp.status_code == 422


def test_manual_create_duplicate_edge(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")
    _make_edge("e1", "req-1", "req-2")

    resp = client.post(
        "/api/edges",
        json={
            "source_id": "req-1",
            "target_id": "req-2",
            "relation_type": "depends_on",
            "evidence": "dup",
        },
    )
    assert resp.status_code == 422


# ── PATCH /api/edges/{id} ────────────────────────────────────────────────────

def test_patch_edge_approve_adds_to_graph(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")
    _make_edge("e1", "req-1", "req-2", EdgeStatus.PENDING)

    assert not store.graph.has_edge("req-1", "req-2")

    resp = client.patch("/api/edges/e1", json={"status": "approved"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"
    assert store.graph.has_edge("req-1", "req-2")


def test_patch_edge_reject_removes_from_graph(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")
    _make_edge("e1", "req-1", "req-2", EdgeStatus.APPROVED)

    assert store.graph.has_edge("req-1", "req-2")

    resp = client.patch("/api/edges/e1", json={"status": "rejected"})
    assert resp.status_code == 200
    assert not store.graph.has_edge("req-1", "req-2")


def test_patch_edge_not_found(client: TestClient) -> None:
    resp = client.patch("/api/edges/nonexistent", json={"status": "approved"})
    assert resp.status_code == 404


def test_patch_edge_evidence(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")
    _make_edge("e1", "req-1", "req-2")

    resp = client.patch("/api/edges/e1", json={"evidence": "new evidence"})
    assert resp.status_code == 200
    assert resp.json()["evidence"] == "new evidence"


# ── DELETE /api/edges/{id} ───────────────────────────────────────────────────

def test_delete_edge_pending(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")
    _make_edge("e1", "req-1", "req-2", EdgeStatus.PENDING)

    resp = client.delete("/api/edges/e1")
    assert resp.status_code == 204
    assert "e1" not in store.edges


def test_delete_edge_approved_removes_from_graph(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")
    _make_edge("e1", "req-1", "req-2", EdgeStatus.APPROVED)

    assert store.graph.has_edge("req-1", "req-2")
    resp = client.delete("/api/edges/e1")
    assert resp.status_code == 204
    assert not store.graph.has_edge("req-1", "req-2")


def test_delete_edge_not_found(client: TestClient) -> None:
    resp = client.delete("/api/edges/nonexistent")
    assert resp.status_code == 404
