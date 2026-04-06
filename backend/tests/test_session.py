"""Tests for session save / load / reset endpoints."""
from __future__ import annotations

import tempfile
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.document import Document, DocumentFormat
from app.models.edge import Edge, EdgeStatus, RelationType
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

def _populate_store() -> None:
    doc = Document(
        id="doc-1",
        filename="spec.md",
        format=DocumentFormat.MARKDOWN,
        raw_text="Users must log in.",
        file_size=18,
        uploaded_at=datetime.now(),
    )
    req = Requirement(
        id="req-1",
        title="Login",
        original_text="Users must log in.",
        location=RequirementLocation(document_id="doc-1", char_start=0, char_end=18),
        display_label="Section 1",
        changed=False,
    )
    req2 = Requirement(
        id="req-2",
        title="Logout",
        original_text="Users must log in.",
        location=RequirementLocation(document_id="doc-1", char_start=0, char_end=18),
        display_label="Section 2",
    )
    edge = Edge(
        id="edge-1",
        source_id="req-1",
        target_id="req-2",
        relation_type=RelationType.DEPENDS_ON,
        evidence="req-1 depends on req-2",
        confidence=0.9,
        status=EdgeStatus.APPROVED,
    )
    store.documents[doc.id] = doc
    store.requirements[req.id] = req
    store.requirements[req2.id] = req2
    store.edges[edge.id] = edge
    store.graph.add_edge(edge.source_id, edge.target_id, edge_id=edge.id)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_reset_clears_all_state(client: TestClient) -> None:
    _populate_store()
    assert len(store.documents) == 1

    resp = client.post("/api/session/reset")
    assert resp.status_code == 200
    assert resp.json() == {"status": "reset"}
    assert len(store.documents) == 0
    assert len(store.requirements) == 0
    assert len(store.edges) == 0
    assert store.graph.number_of_nodes() == 0


def test_save_creates_file(client: TestClient) -> None:
    _populate_store()
    resp = client.post("/api/session/save")
    assert resp.status_code == 200
    data = resp.json()
    assert "filepath" in data
    assert "saved_at" in data
    assert Path(data["filepath"]).exists()
    # Cleanup
    Path(data["filepath"]).unlink(missing_ok=True)


def test_save_load_round_trip(client: TestClient) -> None:
    """save → reset → load should restore identical state."""
    _populate_store()

    save_resp = client.post("/api/session/save")
    filepath = save_resp.json()["filepath"]

    client.post("/api/session/reset")
    assert len(store.documents) == 0

    load_resp = client.post("/api/session/load", json={"filepath": filepath})
    assert load_resp.status_code == 200
    assert load_resp.json() == {"status": "loaded"}

    assert len(store.documents) == 1
    assert "doc-1" in store.documents
    assert len(store.requirements) == 2
    assert "req-1" in store.requirements
    assert len(store.edges) == 1
    assert "edge-1" in store.edges

    Path(filepath).unlink(missing_ok=True)


def test_load_rebuilds_graph_from_approved_edges(client: TestClient) -> None:
    """After load, APPROVED edges must be present in the networkx graph."""
    _populate_store()

    save_resp = client.post("/api/session/save")
    filepath = save_resp.json()["filepath"]

    client.post("/api/session/reset")
    assert store.graph.number_of_edges() == 0

    client.post("/api/session/load", json={"filepath": filepath})

    assert store.graph.has_edge("req-1", "req-2")

    Path(filepath).unlink(missing_ok=True)


def test_load_pending_edges_not_in_graph(client: TestClient) -> None:
    """PENDING edges must NOT be added to the graph on load."""
    edge = Edge(
        id="edge-pending",
        source_id="req-1",
        target_id="req-2",
        relation_type=RelationType.RELATED_TO,
        evidence="pending",
        confidence=0.5,
        status=EdgeStatus.PENDING,
    )
    store.edges[edge.id] = edge

    save_resp = client.post("/api/session/save")
    filepath = save_resp.json()["filepath"]

    client.post("/api/session/reset")
    client.post("/api/session/load", json={"filepath": filepath})

    assert not store.graph.has_edge("req-1", "req-2")

    Path(filepath).unlink(missing_ok=True)


def test_load_file_not_found(client: TestClient) -> None:
    resp = client.post("/api/session/load", json={"filepath": "/nonexistent/path.json"})
    assert resp.status_code == 404


def test_load_invalid_format(client: TestClient) -> None:
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        f.write('{"invalid": "data", "not_a_session": true}')
        tmp_path = f.name

    # Malformed data: documents contains a non-Document object
    bad_path = tmp_path.replace(".json", "_bad.json")
    Path(bad_path).write_text(
        '{"documents": {"x": {"bad": "field"}}, "requirements": {}, "edges": {}}',
        encoding="utf-8",
    )
    resp = client.post("/api/session/load", json={"filepath": bad_path})
    assert resp.status_code == 422

    Path(tmp_path).unlink(missing_ok=True)
    Path(bad_path).unlink(missing_ok=True)


def test_data_integrity_after_round_trip(client: TestClient) -> None:
    """Field values must be identical after save/load cycle."""
    _populate_store()

    save_resp = client.post("/api/session/save")
    filepath = save_resp.json()["filepath"]
    client.post("/api/session/reset")
    client.post("/api/session/load", json={"filepath": filepath})

    req = store.requirements["req-1"]
    assert req.title == "Login"
    assert req.location.document_id == "doc-1"
    assert req.location.char_start == 0

    edge = store.edges["edge-1"]
    assert edge.status == EdgeStatus.APPROVED
    assert edge.relation_type == RelationType.DEPENDS_ON

    Path(filepath).unlink(missing_ok=True)
