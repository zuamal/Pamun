"""Tests for document upload and management endpoints."""
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.storage.store import store

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(autouse=True)
def reset_store() -> None:
    """Reset store before each test to ensure isolation."""
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# ── Upload ────────────────────────────────────────────────────────────────────

def test_upload_markdown(client: TestClient) -> None:
    content = (FIXTURES / "small_sample.md").read_bytes()
    resp = client.post(
        "/api/documents/upload",
        files=[("files", ("small_sample.md", content, "text/markdown"))],
    )
    assert resp.status_code == 201
    docs = resp.json()
    assert len(docs) == 1
    doc = docs[0]
    assert doc["format"] == "markdown"
    assert "Users must be able to log in" in doc["raw_text"]
    assert doc["filename"] == "small_sample.md"


def test_upload_docx(client: TestClient) -> None:
    content = (FIXTURES / "small_sample.docx").read_bytes()
    resp = client.post(
        "/api/documents/upload",
        files=[("files", ("small_sample.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))],
    )
    assert resp.status_code == 201
    docs = resp.json()
    assert len(docs) == 1
    assert docs[0]["format"] == "docx"
    assert "log in" in docs[0]["raw_text"]


def test_upload_pdf(client: TestClient) -> None:
    content = (FIXTURES / "small_sample.pdf").read_bytes()
    resp = client.post(
        "/api/documents/upload",
        files=[("files", ("small_sample.pdf", content, "application/pdf"))],
    )
    assert resp.status_code == 201
    docs = resp.json()
    assert len(docs) == 1
    assert docs[0]["format"] == "pdf"
    assert docs[0]["raw_text"].strip() != ""


def test_upload_multiple_files(client: TestClient) -> None:
    md_content = (FIXTURES / "small_sample.md").read_bytes()
    docx_content = (FIXTURES / "small_sample.docx").read_bytes()
    resp = client.post(
        "/api/documents/upload",
        files=[
            ("files", ("a.md", md_content, "text/markdown")),
            ("files", ("b.docx", docx_content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
        ],
    )
    assert resp.status_code == 201
    assert len(resp.json()) == 2


def test_upload_too_many_files(client: TestClient) -> None:
    md = (FIXTURES / "small_sample.md").read_bytes()
    files = [("files", (f"f{i}.md", md, "text/markdown")) for i in range(6)]
    resp = client.post("/api/documents/upload", files=files)
    assert resp.status_code == 422


def test_upload_unsupported_format(client: TestClient) -> None:
    resp = client.post(
        "/api/documents/upload",
        files=[("files", ("spec.txt", b"hello", "text/plain"))],
    )
    assert resp.status_code == 422


def test_upload_stores_document(client: TestClient) -> None:
    content = (FIXTURES / "small_sample.md").read_bytes()
    resp = client.post(
        "/api/documents/upload",
        files=[("files", ("sample.md", content, "text/markdown"))],
    )
    assert resp.status_code == 201
    doc_id = resp.json()[0]["id"]
    assert doc_id in store.documents


# ── List ──────────────────────────────────────────────────────────────────────

def test_list_documents_empty(client: TestClient) -> None:
    resp = client.get("/api/documents")
    assert resp.status_code == 200
    assert resp.json() == {"documents": []}


def test_list_documents_after_upload(client: TestClient) -> None:
    content = (FIXTURES / "small_sample.md").read_bytes()
    client.post(
        "/api/documents/upload",
        files=[("files", ("sample.md", content, "text/markdown"))],
    )
    resp = client.get("/api/documents")
    assert resp.status_code == 200
    assert len(resp.json()["documents"]) == 1


# ── Get ───────────────────────────────────────────────────────────────────────

def test_get_document(client: TestClient) -> None:
    content = (FIXTURES / "small_sample.md").read_bytes()
    upload_resp = client.post(
        "/api/documents/upload",
        files=[("files", ("sample.md", content, "text/markdown"))],
    )
    doc_id = upload_resp.json()[0]["id"]

    resp = client.get(f"/api/documents/{doc_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == doc_id
    assert "raw_text" in resp.json()


def test_get_document_not_found(client: TestClient) -> None:
    resp = client.get("/api/documents/nonexistent-id")
    assert resp.status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────

def test_delete_document(client: TestClient) -> None:
    content = (FIXTURES / "small_sample.md").read_bytes()
    upload_resp = client.post(
        "/api/documents/upload",
        files=[("files", ("sample.md", content, "text/markdown"))],
    )
    doc_id = upload_resp.json()[0]["id"]

    resp = client.delete(f"/api/documents/{doc_id}")
    assert resp.status_code == 204
    assert doc_id not in store.documents


def test_delete_document_not_found(client: TestClient) -> None:
    resp = client.delete("/api/documents/nonexistent-id")
    assert resp.status_code == 404
