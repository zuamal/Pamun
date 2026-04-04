"""Tests for POST /api/parse and GET /api/requirements.

LLM calls are mocked — no ANTHROPIC_API_KEY needed.
"""
from __future__ import annotations

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.document import Document, DocumentFormat
from app.models.requirement import Requirement, RequirementLocation
from app.storage.store import store

RAW_TEXT = (
    "## 1. Authentication\n"
    "Users must be able to log in with email and password.\n"
    "\n"
    "## 2. Dashboard\n"
    "After login, users are redirected to the dashboard.\n"
)

# pre-calculate real offsets so tests are precise
_AUTH_TEXT = "Users must be able to log in with email and password."
_DASH_TEXT = "After login, users are redirected to the dashboard."
_AUTH_START = RAW_TEXT.index(_AUTH_TEXT)
_AUTH_END = _AUTH_START + len(_AUTH_TEXT)
_DASH_START = RAW_TEXT.index(_DASH_TEXT)
_DASH_END = _DASH_START + len(_DASH_TEXT)

MOCK_REQUIREMENTS = [
    Requirement(
        id="req-1",
        title="User Authentication",
        original_text=_AUTH_TEXT,
        location=RequirementLocation(
            document_id="doc-1",
            char_start=_AUTH_START,
            char_end=_AUTH_END,
        ),
        display_label="1. Authentication",
        changed=False,
    ),
    Requirement(
        id="req-2",
        title="Dashboard Redirect",
        original_text=_DASH_TEXT,
        location=RequirementLocation(
            document_id="doc-1",
            char_start=_DASH_START,
            char_end=_DASH_END,
        ),
        display_label="2. Dashboard",
        changed=False,
    ),
]


@pytest.fixture(autouse=True)
def reset_store() -> None:
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def doc_in_store() -> Document:
    doc = Document(
        id="doc-1",
        filename="spec.md",
        format=DocumentFormat.MARKDOWN,
        raw_text=RAW_TEXT,
        uploaded_at=datetime.now(),
    )
    store.documents[doc.id] = doc
    return doc


# ── POST /api/parse ───────────────────────────────────────────────────────────

def test_parse_success(client: TestClient, doc_in_store: Document) -> None:
    with patch(
        "app.services.parse_service.parse_document",
        return_value=MOCK_REQUIREMENTS,
    ):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["requirements"]) == 2
    assert data["requirements"][0]["title"] == "User Authentication"


def test_parse_stores_requirements(client: TestClient, doc_in_store: Document) -> None:
    with patch(
        "app.services.parse_service.parse_document",
        return_value=MOCK_REQUIREMENTS,
    ):
        client.post("/api/parse", json={"document_ids": ["doc-1"]})

    assert len(store.requirements) == 2
    assert "req-1" in store.requirements


def test_parse_overwrites_previous(client: TestClient, doc_in_store: Document) -> None:
    """Re-parsing a document replaces its previous requirements."""
    # First parse: 2 requirements
    with patch(
        "app.services.parse_service.parse_document",
        return_value=MOCK_REQUIREMENTS,
    ):
        client.post("/api/parse", json={"document_ids": ["doc-1"]})

    assert len(store.requirements) == 2

    # Second parse: only 1 requirement (simulates different LLM output)
    single_req = [MOCK_REQUIREMENTS[0]]
    with patch(
        "app.services.parse_service.parse_document",
        return_value=single_req,
    ):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})

    assert resp.status_code == 200
    assert len(store.requirements) == 1


def test_parse_missing_document_id(client: TestClient) -> None:
    resp = client.post("/api/parse", json={"document_ids": ["nonexistent"]})
    assert resp.status_code == 422


def test_parse_empty_document_ids(client: TestClient) -> None:
    resp = client.post("/api/parse", json={"document_ids": []})
    assert resp.status_code == 422


def test_parse_no_api_key_returns_503(client: TestClient, doc_in_store: Document) -> None:
    """When ANTHROPIC_API_KEY is missing the service raises ValueError → 503."""
    with patch(
        "app.services.parse_service.parse_document",
        side_effect=ValueError("ANTHROPIC_API_KEY가 설정되지 않았습니다."),
    ):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})

    assert resp.status_code == 503


# ── char_start / char_end validation ─────────────────────────────────────────

def test_parse_char_offsets_correct(client: TestClient, doc_in_store: Document) -> None:
    with patch(
        "app.services.parse_service.parse_document",
        return_value=MOCK_REQUIREMENTS,
    ):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})

    reqs = resp.json()["requirements"]
    for req in reqs:
        cs = req["location"]["char_start"]
        ce = req["location"]["char_end"]
        assert 0 <= cs < ce <= len(RAW_TEXT), f"offsets out of range for {req['title']}"
        assert RAW_TEXT[cs:ce] == req["original_text"]


# ── GET /api/requirements ─────────────────────────────────────────────────────

def test_list_requirements_empty(client: TestClient) -> None:
    resp = client.get("/api/requirements")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_requirements_after_parse(client: TestClient, doc_in_store: Document) -> None:
    with patch(
        "app.services.parse_service.parse_document",
        return_value=MOCK_REQUIREMENTS,
    ):
        client.post("/api/parse", json={"document_ids": ["doc-1"]})

    resp = client.get("/api/requirements")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
