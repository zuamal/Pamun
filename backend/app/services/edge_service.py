"""Edge CRUD, graph synchronization, and inference orchestration."""
from __future__ import annotations

import uuid
from collections.abc import Iterator

from instructor.core.exceptions import InstructorRetryException

from app.llm.inferrer import infer_edges
from app.models.api import ProgressEvent, ProgressStep
from app.models.edge import Edge, EdgeStatus, RelationType
from app.models.requirement import Requirement
from app.storage.store import store


def _sse(event: ProgressEvent) -> str:
    return f"data: {event.model_dump_json()}\n\n"


# ── Graph sync helpers ────────────────────────────────────────────────────────

def _add_to_graph(edge: Edge) -> None:
    """Add edge to networkx graph (only when APPROVED)."""
    store.graph.add_edge(edge.source_id, edge.target_id, edge_id=edge.id)


def _remove_from_graph(edge: Edge) -> None:
    """Remove edge from networkx graph if present."""
    if store.graph.has_edge(edge.source_id, edge.target_id):
        store.graph.remove_edge(edge.source_id, edge.target_id)


def _sync_graph(old_edge: Edge | None, new_edge: Edge) -> None:
    """Sync graph based on edge status transition.

    - Becoming APPROVED: add to graph.
    - Leaving APPROVED: remove from graph.
    - No status change to/from APPROVED: no-op.
    """
    was_approved = old_edge is not None and old_edge.status == EdgeStatus.APPROVED
    is_approved = new_edge.status == EdgeStatus.APPROVED

    if is_approved and not was_approved:
        _add_to_graph(new_edge)
    elif was_approved and not is_approved:
        assert old_edge is not None
        _remove_from_graph(old_edge)  # use old edge to locate graph edge


# ── Pair helpers ──────────────────────────────────────────────────────────────

def _existing_pairs() -> set[tuple[str, str]]:
    return {(e.source_id, e.target_id) for e in store.edges.values()}


# ── Public API ────────────────────────────────────────────────────────────────

def stream_run_inference(requirement_ids: list[str] | None) -> Iterator[str]:
    """Streaming version of run_inference.

    Yields SSE-formatted strings with ProgressEvent JSON.
    """
    yield _sse(ProgressEvent(step=ProgressStep.PREPARING, message="추론 준비 중...", progress=0))

    if requirement_ids is not None:
        reqs: list[Requirement] = [
            store.requirements[rid]
            for rid in requirement_ids
            if rid in store.requirements
        ]
    else:
        reqs = list(store.requirements.values())

    if not reqs:
        yield _sse(ProgressEvent(
            step=ProgressStep.ERROR,
            message="추론할 요구사항이 없습니다. 먼저 /api/parse를 실행하세요.",
            progress=0,
        ))
        return

    yield _sse(ProgressEvent(
        step=ProgressStep.INFERRING,
        message=f"의존관계 추론 중... (요구사항 {len(reqs)}개)",
        progress=50,
    ))

    try:
        candidate_edges = infer_edges(reqs)
    except InstructorRetryException as exc:
        cause = getattr(exc.__cause__, "message", None) or str(exc.__cause__ or exc)
        yield _sse(ProgressEvent(
            step=ProgressStep.ERROR,
            message=f"LLM 호출 실패: {cause}",
            progress=50,
        ))
        return

    yield _sse(ProgressEvent(step=ProgressStep.SAVING, message="Edge 생성 중...", progress=90))

    existing_pairs = _existing_pairs()
    new_edges: list[Edge] = []
    for edge in candidate_edges:
        pair = (edge.source_id, edge.target_id)
        if pair in existing_pairs:
            continue
        existing_pairs.add(pair)
        store.edges[edge.id] = edge
        new_edges.append(edge)

    count = len(new_edges)
    yield _sse(ProgressEvent(
        step=ProgressStep.DONE,
        message=f"추론 완료 — Edge {count}개 생성",
        progress=100,
    ))


def run_inference(requirement_ids: list[str] | None) -> list[Edge]:
    """Run LLM inference and store new edges (PENDING).

    Skips edges whose (source_id, target_id) pair already exists.
    Raises ValueError if no requirements are in the store (or filtered result is empty).
    """
    if requirement_ids is not None:
        reqs: list[Requirement] = [
            store.requirements[rid]
            for rid in requirement_ids
            if rid in store.requirements
        ]
    else:
        reqs = list(store.requirements.values())

    if not reqs:
        raise ValueError("추론할 요구사항이 없습니다. 먼저 /api/parse를 실행하세요.")

    existing_pairs = _existing_pairs()
    candidate_edges = infer_edges(reqs)

    new_edges: list[Edge] = []
    for edge in candidate_edges:
        pair = (edge.source_id, edge.target_id)
        if pair in existing_pairs:
            continue  # skip duplicate
        existing_pairs.add(pair)
        store.edges[edge.id] = edge
        # PENDING edges are NOT added to the graph
        new_edges.append(edge)

    return new_edges


def create_edge(
    source_id: str,
    target_id: str,
    relation_type: RelationType,
    evidence: str,
) -> Edge:
    """Create a manual edge (status=APPROVED, added to graph immediately).

    Raises ValueError if source/target IDs don't exist or pair is duplicate.
    """
    if source_id not in store.requirements:
        raise ValueError(f"source_id에 해당하는 요구사항이 없습니다: {source_id}")
    if target_id not in store.requirements:
        raise ValueError(f"target_id에 해당하는 요구사항이 없습니다: {target_id}")

    pair = (source_id, target_id)
    if pair in _existing_pairs():
        raise ValueError(f"이미 존재하는 Edge입니다: {source_id} → {target_id}")

    edge = Edge(
        id=str(uuid.uuid4()),
        source_id=source_id,
        target_id=target_id,
        relation_type=relation_type,
        evidence=evidence,
        confidence=1.0,
        status=EdgeStatus.APPROVED,
    )
    store.edges[edge.id] = edge
    _add_to_graph(edge)
    return edge


def update_edge(
    edge_id: str,
    status: EdgeStatus | None,
    relation_type: RelationType | None,
    evidence: str | None,
) -> Edge:
    """Update an edge's status, relation_type, or evidence.

    Syncs graph on status transitions to/from APPROVED.
    Raises KeyError if edge_id not found.
    """
    old_edge = store.edges.get(edge_id)
    if old_edge is None:
        raise KeyError(edge_id)

    updates: dict[str, object] = {}
    if status is not None:
        updates["status"] = status
    if relation_type is not None:
        updates["relation_type"] = relation_type
    if evidence is not None:
        updates["evidence"] = evidence

    new_edge = old_edge.model_copy(update=updates)
    store.edges[edge_id] = new_edge
    _sync_graph(old_edge, new_edge)
    return new_edge


def delete_edge(edge_id: str) -> None:
    """Delete an edge and remove from graph.

    Raises KeyError if edge_id not found.
    """
    edge = store.edges.get(edge_id)
    if edge is None:
        raise KeyError(edge_id)

    _remove_from_graph(edge)
    del store.edges[edge_id]
