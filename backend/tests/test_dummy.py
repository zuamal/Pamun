"""Tests for dummy bundle loader endpoints."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.storage.store import store


@pytest.fixture(autouse=True)
def reset_store() -> None:
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_list_bundles_returns_three(client: TestClient) -> None:
    resp = client.get("/api/dummy/bundles")
    assert resp.status_code == 200
    bundles = resp.json()
    names = {b["name"] for b in bundles}
    assert names == {"BookFlow", "LearnHub", "MediBook"}


def test_list_bundles_have_files(client: TestClient) -> None:
    resp = client.get("/api/dummy/bundles")
    bundles = {b["name"]: b["files"] for b in resp.json()}
    assert len(bundles["BookFlow"]) == 3
    assert len(bundles["LearnHub"]) == 5
    assert len(bundles["MediBook"]) == 4


def test_load_bookflow_success(client: TestClient) -> None:
    resp = client.post("/api/dummy/load/BookFlow")
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) == 3


def test_load_bookflow_stored_in_documents(client: TestClient) -> None:
    client.post("/api/dummy/load/BookFlow")
    resp = client.get("/api/documents")
    assert resp.status_code == 200
    stored = resp.json()["documents"]
    assert len(stored) == 3


def test_load_resets_existing_state(client: TestClient) -> None:
    # Load LearnHub first (5 docs), then BookFlow (3 docs) — result must be 3
    client.post("/api/dummy/load/LearnHub")
    client.post("/api/dummy/load/BookFlow")
    resp = client.get("/api/documents")
    assert len(resp.json()["documents"]) == 3


def test_load_unknown_bundle_returns_404(client: TestClient) -> None:
    resp = client.post("/api/dummy/load/NonExistent")
    assert resp.status_code == 404
