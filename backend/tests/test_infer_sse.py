"""SSE-specific tests for POST /api/edges/infer.

Verifies event ordering, monotonic progress, and error handling.
LLM calls are mocked — no ANTHROPIC_API_KEY needed.
"""
from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from instructor.core.exceptions import InstructorRetryException

from app.main import app
from app.models.edge import Edge, EdgeStatus, RelationType
from app.models.requirement import Requirement, RequirementLocation
from app.storage.store import store

MOCK_EDGES = [
    Edge(
        id="edge-1",
        source_id="req-1",
        target_id="req-2",
        relation_type=RelationType.DEPENDS_ON,
        evidence="req-1 depends on req-2",
        confidence=0.9,
        status=EdgeStatus.PENDING,
    )
]


def _parse_sse(text: str) -> list[dict[str, object]]:
    return [
        json.loads(line[6:])
        for line in text.split("\n")
        if line.startswith("data: ")
    ]


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


@pytest.fixture(autouse=True)
def reset_store() -> None:
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_infer_sse_content_type(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")

    with patch("app.services.edge_service.infer_edges", return_value=MOCK_EDGES):
        resp = client.post("/api/edges/infer", json={"requirement_ids": None})

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]


def test_infer_sse_event_order(client: TestClient) -> None:
    """Events must be: preparing → inferring → saving → done."""
    _make_req("req-1")
    _make_req("req-2")

    with patch("app.services.edge_service.infer_edges", return_value=MOCK_EDGES):
        resp = client.post("/api/edges/infer", json={"requirement_ids": None})

    events = _parse_sse(resp.text)
    steps = [e["step"] for e in events]

    assert steps[0] == "preparing"
    assert "inferring" in steps
    assert "saving" in steps
    assert steps[-1] == "done"


def test_infer_sse_progress_monotonic(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")

    with patch("app.services.edge_service.infer_edges", return_value=MOCK_EDGES):
        resp = client.post("/api/edges/infer", json={"requirement_ids": None})

    events = _parse_sse(resp.text)
    progresses = [int(e["progress"]) for e in events]
    assert progresses == sorted(progresses), f"Progress not monotonic: {progresses}"


def test_infer_sse_done_progress_100(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")

    with patch("app.services.edge_service.infer_edges", return_value=MOCK_EDGES):
        resp = client.post("/api/edges/infer", json={"requirement_ids": None})

    events = _parse_sse(resp.text)
    done = next(e for e in events if e["step"] == "done")
    assert done["progress"] == 100


def test_infer_sse_error_no_requirements(client: TestClient) -> None:
    """Empty store emits an 'error' event."""
    resp = client.post("/api/edges/infer", json={"requirement_ids": None})

    assert resp.status_code == 200
    events = _parse_sse(resp.text)
    steps = [e["step"] for e in events]

    assert "error" in steps
    assert "done" not in steps


def test_infer_sse_error_on_llm_failure(client: TestClient) -> None:
    """LLM InstructorRetryException emits an 'error' event."""
    _make_req("req-1")
    _make_req("req-2")

    with patch(
        "app.services.edge_service.infer_edges",
        side_effect=InstructorRetryException(
            n_attempts=3, last_completion=None, messages=[],  # type: ignore[arg-type]
            total_usage=None,  # type: ignore[arg-type]
        ),
    ):
        resp = client.post("/api/edges/infer", json={"requirement_ids": None})

    assert resp.status_code == 200
    events = _parse_sse(resp.text)
    steps = [e["step"] for e in events]

    assert "error" in steps
    assert "done" not in steps


def test_infer_sse_done_message_includes_count(client: TestClient) -> None:
    _make_req("req-1")
    _make_req("req-2")

    with patch("app.services.edge_service.infer_edges", return_value=MOCK_EDGES):
        resp = client.post("/api/edges/infer", json={"requirement_ids": None})

    events = _parse_sse(resp.text)
    done = next(e for e in events if e["step"] == "done")
    assert "1" in str(done["message"])  # 1 edge created
