"""Parse service: orchestrates LLM parsing for one or more documents."""
from __future__ import annotations

from collections.abc import Iterator

from instructor.core.exceptions import InstructorRetryException

from app.llm.parser import parse_document
from app.models.api import ProgressEvent, ProgressStep
from app.models.document import Document
from app.models.requirement import Requirement
from app.storage.store import store


def _sse(event: ProgressEvent) -> str:
    return f"data: {event.model_dump_json()}\n\n"


def parse_documents(documents: list[Document]) -> list[Requirement]:
    """Parse a list of documents via LLM and persist results.

    For each document, existing requirements from that document are removed
    before storing new ones (re-parse = overwrite).
    """
    all_requirements: list[Requirement] = []

    for doc in documents:
        existing_ids = [
            req_id
            for req_id, req in store.requirements.items()
            if req.location.document_id == doc.id
        ]
        for req_id in existing_ids:
            # Remove edges referencing this requirement before deleting it
            edge_ids = [
                eid for eid, e in store.edges.items()
                if e.source_id == req_id or e.target_id == req_id
            ]
            for eid in edge_ids:
                edge = store.edges.pop(eid)
                if store.graph.has_edge(edge.source_id, edge.target_id):
                    store.graph.remove_edge(edge.source_id, edge.target_id)
            if store.graph.has_node(req_id):
                store.graph.remove_node(req_id)
            del store.requirements[req_id]

        new_reqs = parse_document(doc)
        for req in new_reqs:
            store.requirements[req.id] = req

        all_requirements.extend(new_reqs)

    return all_requirements


def stream_parse_documents(documents: list[Document]) -> Iterator[str]:
    """Streaming version of parse_documents.

    Yields SSE-formatted strings with ProgressEvent JSON.
    """
    n = len(documents)
    yield _sse(ProgressEvent(step=ProgressStep.PREPARING, message="파싱 준비 중...", progress=0))

    all_requirements: list[Requirement] = []

    for i, doc in enumerate(documents):
        progress = 10 + int(75 * i / n)
        yield _sse(ProgressEvent(
            step=ProgressStep.PARSING,
            message=f"문서 파싱 중 ({i + 1}/{n}): {doc.filename}",
            progress=progress,
        ))

        existing_ids = [
            req_id
            for req_id, req in store.requirements.items()
            if req.location.document_id == doc.id
        ]
        for req_id in existing_ids:
            edge_ids = [
                eid for eid, e in store.edges.items()
                if e.source_id == req_id or e.target_id == req_id
            ]
            for eid in edge_ids:
                edge = store.edges.pop(eid)
                if store.graph.has_edge(edge.source_id, edge.target_id):
                    store.graph.remove_edge(edge.source_id, edge.target_id)
            if store.graph.has_node(req_id):
                store.graph.remove_node(req_id)
            del store.requirements[req_id]

        try:
            new_reqs = parse_document(doc)
        except ValueError as exc:
            yield _sse(ProgressEvent(
                step=ProgressStep.ERROR,
                message=str(exc),
                progress=progress,
            ))
            return
        except InstructorRetryException as exc:
            cause = getattr(exc.__cause__, "message", None) or str(exc.__cause__ or exc)
            yield _sse(ProgressEvent(
                step=ProgressStep.ERROR,
                message=f"LLM 호출 실패: {cause}",
                progress=progress,
            ))
            return

        for req in new_reqs:
            store.requirements[req.id] = req
        all_requirements.extend(new_reqs)

    yield _sse(ProgressEvent(step=ProgressStep.SAVING, message="요구사항 저장 중...", progress=90))
    count = len(all_requirements)
    yield _sse(ProgressEvent(
        step=ProgressStep.DONE,
        message=f"파싱 완료 — 요구사항 {count}개 추출",
        progress=100,
    ))
