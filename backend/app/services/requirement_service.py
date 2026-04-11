"""Business logic for requirement management: update, delete, merge, split."""
from __future__ import annotations

import uuid

from app.models.edge import Edge
from app.models.requirement import Requirement, RequirementLocation
from app.storage.store import store


def update_requirement(
    req_id: str,
    title: str | None,
    changed: bool | None,
) -> Requirement:
    """Apply a partial update to a requirement.

    Raises KeyError if req_id is not found.
    Raises ValueError if both title and changed are None.
    """
    if title is None and changed is None:
        raise ValueError("title과 changed 중 하나 이상을 제공해야 합니다.")

    req = store.requirements.get(req_id)
    if req is None:
        raise KeyError(req_id)

    updates: dict[str, object] = {}
    if title is not None:
        updates["title"] = title
    if changed is not None:
        updates["changed"] = changed

    updated = req.model_copy(update=updates)
    store.requirements[req_id] = updated
    return updated


def _delete_edges_for_requirement(req_id: str) -> None:
    """Remove all edges connected to req_id from store and graph."""
    to_delete = [
        eid
        for eid, edge in store.edges.items()
        if edge.source_id == req_id or edge.target_id == req_id
    ]
    for eid in to_delete:
        edge = store.edges.pop(eid)
        if store.graph.has_edge(edge.source_id, edge.target_id):
            store.graph.remove_edge(edge.source_id, edge.target_id)

    if store.graph.has_node(req_id):
        store.graph.remove_node(req_id)


def delete_requirement(req_id: str) -> None:
    """Delete a requirement and all its connected edges.

    Raises KeyError if req_id is not found.
    """
    if req_id not in store.requirements:
        raise KeyError(req_id)

    _delete_edges_for_requirement(req_id)
    del store.requirements[req_id]


def _relink_edges(old_id: str, new_id: str, seen: set[tuple[str, str]]) -> None:
    """Move edges from old_id to new_id, skipping duplicates.

    `seen` is a set of (source_id, target_id) tuples already present on new_id.
    """
    to_update: list[tuple[str, Edge]] = [
        (eid, e)
        for eid, e in store.edges.items()
        if e.source_id == old_id or e.target_id == old_id
    ]

    for eid, edge in to_update:
        new_source = new_id if edge.source_id == old_id else edge.source_id
        new_target = new_id if edge.target_id == old_id else edge.target_id
        pair = (new_source, new_target)

        # Remove old graph edge
        if store.graph.has_edge(edge.source_id, edge.target_id):
            store.graph.remove_edge(edge.source_id, edge.target_id)

        # Discard self-loops
        if new_source == new_target:
            del store.edges[eid]
            continue

        if pair in seen:
            # Duplicate — discard this edge
            del store.edges[eid]
            continue

        seen.add(pair)
        updated_edge = edge.model_copy(update={"source_id": new_source, "target_id": new_target})
        store.edges[eid] = updated_edge
        store.graph.add_edge(new_source, new_target, edge_id=eid)

    # Clean up old node
    if store.graph.has_node(old_id):
        store.graph.remove_node(old_id)


def merge_requirements(requirement_ids: list[str]) -> Requirement:
    """Merge two or more requirements into one.

    Rules:
    - All must belong to the same document.
    - Must be adjacent spans (only whitespace between them).
    - New requirement: char_start=min, char_end=max, title=first's title.
    - Edges re-linked to the new ID.

    Raises KeyError if any ID is not found.
    Raises ValueError on document mismatch or non-adjacency.
    """
    reqs = []
    for rid in requirement_ids:
        req = store.requirements.get(rid)
        if req is None:
            raise KeyError(rid)
        reqs.append(req)

    # Validate: same document
    doc_ids = {r.location.document_id for r in reqs}
    if len(doc_ids) != 1:
        raise ValueError("병합할 요구사항은 모두 같은 문서에 속해야 합니다.")

    doc_id = doc_ids.pop()
    doc = store.documents.get(doc_id)
    if doc is None:
        raise ValueError(f"문서를 찾을 수 없습니다: {doc_id}")

    # Sort by char_start
    sorted_reqs = sorted(reqs, key=lambda r: r.location.char_start)

    # Validate adjacency
    raw = doc.raw_text
    for i in range(len(sorted_reqs) - 1):
        gap_start = sorted_reqs[i].location.char_end
        gap_end = sorted_reqs[i + 1].location.char_start
        if gap_start > gap_end:
            raise ValueError(
                f"요구사항 span이 겹칩니다: '{sorted_reqs[i].title}' ~ '{sorted_reqs[i+1].title}'"
            )
        gap = raw[gap_start:gap_end]
        if gap and not gap.isspace():
            raise ValueError(
                f"인접하지 않은 요구사항은 병합할 수 없습니다: "
                f"'{sorted_reqs[i].title}'과 '{sorted_reqs[i+1].title}' 사이에 텍스트가 있습니다."
            )

    char_start = sorted_reqs[0].location.char_start
    char_end = sorted_reqs[-1].location.char_end

    new_req = Requirement(
        id=str(uuid.uuid4()),
        title=sorted_reqs[0].title,
        original_text=raw[char_start:char_end],
        location=RequirementLocation(
            document_id=doc_id,
            char_start=char_start,
            char_end=char_end,
        ),
        display_label=sorted_reqs[0].display_label,
        changed=sorted_reqs[0].changed,
    )

    # Track existing edges on the new node (none yet)
    seen_pairs: set[tuple[str, str]] = set()

    # Re-link edges from all old requirements to new ID
    for old_req in sorted_reqs:
        _relink_edges(old_req.id, new_req.id, seen_pairs)
        del store.requirements[old_req.id]

    store.requirements[new_req.id] = new_req
    return new_req


def split_requirement(requirement_id: str, split_offset: int) -> tuple[Requirement, Requirement]:
    """Split a requirement at the given offset within its original_text.

    split_offset must be in (0, len(original_text)) exclusive.
    Edges re-linked to the first part.

    Returns (part1, part2).
    Raises KeyError if requirement_id is not found.
    Raises ValueError if split_offset is out of valid range.
    """
    req = store.requirements.get(requirement_id)
    if req is None:
        raise KeyError(requirement_id)

    text_len = len(req.original_text)
    if split_offset <= 0 or split_offset >= text_len:
        raise ValueError(
            f"split_offset은 0 초과 {text_len} 미만이어야 합니다. 받은 값: {split_offset}"
        )

    text1 = req.original_text[:split_offset]
    text2 = req.original_text[split_offset:]
    abs_start = req.location.char_start

    part1 = Requirement(
        id=str(uuid.uuid4()),
        title=req.title,
        original_text=text1,
        location=RequirementLocation(
            document_id=req.location.document_id,
            char_start=abs_start,
            char_end=abs_start + split_offset,
        ),
        display_label=req.display_label,
        changed=req.changed,
    )
    part2 = Requirement(
        id=str(uuid.uuid4()),
        title=req.title + " (2)",
        original_text=text2,
        location=RequirementLocation(
            document_id=req.location.document_id,
            char_start=abs_start + split_offset,
            char_end=req.location.char_end,
        ),
        display_label=req.display_label,
        changed=req.changed,
    )

    # Re-link edges from old ID to part1
    seen_pairs: set[tuple[str, str]] = set()
    _relink_edges(requirement_id, part1.id, seen_pairs)

    del store.requirements[requirement_id]
    store.requirements[part1.id] = part1
    store.requirements[part2.id] = part2

    return part1, part2
