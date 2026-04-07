"""SSE-specific tests for POST /api/parse.

Verifies event ordering, monotonic progress, and error handling.
LLM calls are mocked — no ANTHROPIC_API_KEY needed.
"""
from __future__ import annotations

import json
from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.document import Document, DocumentFormat
from app.models.requirement import Requirement, RequirementLocation
from app.storage.store import store

RAW_TEXT = (
    "## 1. Auth\nUsers must log in.\n"
    "## 2. Dashboard\nUsers see a dashboard.\n"
    "## 3. Logout\nUsers can log out.\n"
)

_REQS = [
    Requirement(
        id=f"req-{i}",
        title=f"Req {i}",
        original_text="Users must log in.",
        location=RequirementLocation(document_id="doc-1", char_start=0, char_end=18),
        display_label=f"Section {i}",
    )
    for i in range(1, 4)
]


def _parse_sse(text: str) -> list[dict[str, object]]:
    return [
        json.loads(line[6:])
        for line in text.split("\n")
        if line.startswith("data: ")
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
        file_size=len(RAW_TEXT.encode()),
        uploaded_at=datetime.now(),
    )
    store.documents[doc.id] = doc
    return doc


def test_parse_sse_content_type(client: TestClient, doc_in_store: Document) -> None:
    with patch("app.services.parse_service.parse_document", return_value=_REQS):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]


def test_parse_sse_event_order(client: TestClient, doc_in_store: Document) -> None:
    """Events must start with 'preparing' and end with 'done'."""
    with patch("app.services.parse_service.parse_document", return_value=_REQS):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})

    events = _parse_sse(resp.text)
    steps = [e["step"] for e in events]

    assert steps[0] == "preparing"
    assert steps[-1] == "done"
    assert "parsing" in steps
    assert "saving" in steps


def test_parse_sse_progress_monotonic(client: TestClient, doc_in_store: Document) -> None:
    """Progress values must be monotonically non-decreasing."""
    with patch("app.services.parse_service.parse_document", return_value=_REQS):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})

    events = _parse_sse(resp.text)
    progresses = [int(e["progress"]) for e in events]
    assert progresses == sorted(progresses), f"Progress not monotonic: {progresses}"


def test_parse_sse_done_progress_100(client: TestClient, doc_in_store: Document) -> None:
    with patch("app.services.parse_service.parse_document", return_value=_REQS):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})

    events = _parse_sse(resp.text)
    done = next(e for e in events if e["step"] == "done")
    assert done["progress"] == 100


def test_parse_sse_parsing_events_per_document(client: TestClient, doc_in_store: Document) -> None:
    """One 'parsing' event per document."""
    with patch("app.services.parse_service.parse_document", return_value=_REQS):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})

    events = _parse_sse(resp.text)
    parsing_events = [e for e in events if e["step"] == "parsing"]
    assert len(parsing_events) == 1  # 1 document → 1 parsing event


def test_parse_sse_error_on_llm_failure(client: TestClient, doc_in_store: Document) -> None:
    """LLM failure must emit an 'error' event and stop the stream."""
    with patch(
        "app.services.parse_service.parse_document",
        side_effect=ValueError("ANTHROPIC_API_KEY가 설정되지 않았습니다."),
    ):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1"]})

    assert resp.status_code == 200
    events = _parse_sse(resp.text)
    steps = [e["step"] for e in events]

    assert "error" in steps
    assert "done" not in steps  # stream ended on error


def test_parse_sse_validation_errors_are_http(client: TestClient) -> None:
    """Validation errors (empty list, missing IDs) return HTTP 422 before SSE starts."""
    resp_empty = client.post("/api/parse", json={"document_ids": []})
    assert resp_empty.status_code == 422

    resp_missing = client.post("/api/parse", json={"document_ids": ["nonexistent"]})
    assert resp_missing.status_code == 422


def test_parse_sse_multiple_documents(client: TestClient) -> None:
    """Multiple documents produce one 'parsing' event each."""
    doc1 = Document(
        id="doc-1", filename="a.md", format=DocumentFormat.MARKDOWN,
        raw_text="Doc A", file_size=5, uploaded_at=datetime.now(),
    )
    doc2 = Document(
        id="doc-2", filename="b.md", format=DocumentFormat.MARKDOWN,
        raw_text="Doc B", file_size=5, uploaded_at=datetime.now(),
    )
    store.documents["doc-1"] = doc1
    store.documents["doc-2"] = doc2

    with patch("app.services.parse_service.parse_document", return_value=_REQS[:1]):
        resp = client.post("/api/parse", json={"document_ids": ["doc-1", "doc-2"]})

    events = _parse_sse(resp.text)
    parsing_events = [e for e in events if e["step"] == "parsing"]
    assert len(parsing_events) == 2
