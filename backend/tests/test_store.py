"""Unit tests for AppStore: basic CRUD operations."""
from datetime import datetime

import pytest

from app.storage.store import AppStore
from app.models.document import Document, DocumentFormat
from app.models.requirement import Requirement, RequirementLocation
from app.models.edge import Edge, RelationType, EdgeStatus


@pytest.fixture
def store() -> AppStore:
    s = AppStore()
    return s


# ── Documents ────────────────────────────────────────────────────────────────

def test_store_add_document(store: AppStore) -> None:
    doc = Document(
        id="doc-1",
        filename="spec.md",
        format=DocumentFormat.MARKDOWN,
        raw_text="# Requirements\n- Login\n- Logout",
        file_size=32,
        uploaded_at=datetime.now(),
    )
    store.documents[doc.id] = doc
    assert store.documents["doc-1"] is doc


def test_store_delete_document(store: AppStore) -> None:
    doc = Document(
        id="doc-1",
        filename="spec.md",
        format=DocumentFormat.MARKDOWN,
        raw_text="text",
        file_size=4,
        uploaded_at=datetime.now(),
    )
    store.documents[doc.id] = doc
    del store.documents[doc.id]
    assert "doc-1" not in store.documents


# ── Requirements ─────────────────────────────────────────────────────────────

def test_store_add_requirement(store: AppStore) -> None:
    req = Requirement(
        id="req-1",
        title="User login",
        original_text="Users must be able to log in.",
        location=RequirementLocation(document_id="doc-1", char_start=0, char_end=29),
        display_label="Section 1",
        changed=False,
    )
    store.requirements[req.id] = req
    assert store.requirements["req-1"].title == "User login"


def test_store_update_requirement_changed_flag(store: AppStore) -> None:
    req = Requirement(
        id="req-1",
        title="User login",
        original_text="text",
        location=RequirementLocation(document_id="doc-1", char_start=0, char_end=4),
        display_label="Para 1",
        changed=False,
    )
    store.requirements[req.id] = req
    store.requirements["req-1"] = req.model_copy(update={"changed": True})
    assert store.requirements["req-1"].changed is True


def test_store_delete_requirement(store: AppStore) -> None:
    req = Requirement(
        id="req-1",
        title="Login",
        original_text="text",
        location=RequirementLocation(document_id="doc-1", char_start=0, char_end=4),
        display_label="Para 1",
    )
    store.requirements[req.id] = req
    del store.requirements["req-1"]
    assert "req-1" not in store.requirements


# ── Edges ─────────────────────────────────────────────────────────────────────

def test_store_add_edge(store: AppStore) -> None:
    edge = Edge(
        id="edge-1",
        source_id="req-1",
        target_id="req-2",
        relation_type=RelationType.DEPENDS_ON,
        evidence="req-1 references req-2",
        confidence=0.9,
        status=EdgeStatus.PENDING,
    )
    store.edges[edge.id] = edge
    store.graph.add_edge(edge.source_id, edge.target_id, edge_id=edge.id)

    assert "edge-1" in store.edges
    assert store.graph.has_edge("req-1", "req-2")


def test_store_delete_edge(store: AppStore) -> None:
    edge = Edge(
        id="edge-1",
        source_id="req-1",
        target_id="req-2",
        relation_type=RelationType.RELATED_TO,
        evidence="they are related",
        confidence=0.7,
    )
    store.edges[edge.id] = edge
    store.graph.add_edge(edge.source_id, edge.target_id, edge_id=edge.id)

    del store.edges["edge-1"]
    store.graph.remove_edge("req-1", "req-2")

    assert "edge-1" not in store.edges
    assert not store.graph.has_edge("req-1", "req-2")


# ── Reset ─────────────────────────────────────────────────────────────────────

def test_store_reset(store: AppStore) -> None:
    store.documents["doc-1"] = Document(
        id="doc-1",
        filename="f.md",
        format=DocumentFormat.MARKDOWN,
        raw_text="x",
        file_size=1,
        uploaded_at=datetime.now(),
    )
    store.requirements["req-1"] = Requirement(
        id="req-1",
        title="T",
        original_text="x",
        location=RequirementLocation(document_id="doc-1", char_start=0, char_end=1),
        display_label="P1",
    )
    store.graph.add_node("req-1")

    store.reset()

    assert len(store.documents) == 0
    assert len(store.requirements) == 0
    assert len(store.edges) == 0
    assert store.graph.number_of_nodes() == 0
