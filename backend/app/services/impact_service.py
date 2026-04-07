"""1-hop impact analysis service.

Policy (ADR-6 / CLAUDE.md Edge 방향성 규칙):
  - related_to  : 양방향 → 양쪽 모두 AFFECTED
  - depends_on  : target이 changed → source는 AFFECTED
                  source가 changed → target은 REVIEW_RECOMMENDED
"""
from __future__ import annotations

from app.models.edge import Edge, EdgeStatus, RelationType
from app.models.impact import ImpactItem, ImpactLevel, ImpactResult
from app.storage.store import store

# Impact level priority: AFFECTED > REVIEW_RECOMMENDED
_LEVEL_PRIORITY: dict[ImpactLevel, int] = {
    ImpactLevel.AFFECTED: 1,
    ImpactLevel.REVIEW_RECOMMENDED: 0,
}


def _higher(a: ImpactLevel, b: ImpactLevel) -> ImpactLevel:
    return a if _LEVEL_PRIORITY[a] >= _LEVEL_PRIORITY[b] else b


def compute_impact() -> ImpactResult:
    """Run 1-hop impact analysis based on current changed flags.

    Only APPROVED edges are used.
    Changed requirements themselves are excluded from the result.
    When a requirement is reachable via multiple edges/paths,
    the highest impact level (affected > review_recommended) is kept.
    """
    changed_ids = {
        rid for rid, req in store.requirements.items() if req.changed
    }

    # Map: impacted_req_id → (ImpactLevel, triggering Edge)
    impact_map: dict[str, tuple[ImpactLevel, Edge]] = {}

    def _record(req_id: str, level: ImpactLevel, edge: Edge) -> None:
        if req_id in changed_ids:
            return  # never include changed nodes themselves
        if req_id not in store.requirements:
            return  # stale edge reference; skip

        existing = impact_map.get(req_id)
        if existing is None or _LEVEL_PRIORITY[level] > _LEVEL_PRIORITY[existing[0]]:
            impact_map[req_id] = (level, edge)

    approved_edges = [
        e for e in store.edges.values() if e.status == EdgeStatus.APPROVED
    ]

    for edge in approved_edges:
        src_changed = edge.source_id in changed_ids
        tgt_changed = edge.target_id in changed_ids

        if edge.relation_type == RelationType.RELATED_TO:
            if src_changed:
                _record(edge.target_id, ImpactLevel.AFFECTED, edge)
            if tgt_changed:
                _record(edge.source_id, ImpactLevel.AFFECTED, edge)

        elif edge.relation_type == RelationType.DEPENDS_ON:
            # target changed → source is affected
            if tgt_changed:
                _record(edge.source_id, ImpactLevel.AFFECTED, edge)
            # source changed → target is review_recommended
            if src_changed:
                _record(edge.target_id, ImpactLevel.REVIEW_RECOMMENDED, edge)

    # Build ImpactItem list
    affected_items: list[ImpactItem] = []
    review_items: list[ImpactItem] = []

    for req_id, (level, edge) in impact_map.items():
        req = store.requirements[req_id]
        doc = store.documents.get(req.location.document_id)
        doc_filename = doc.filename if doc else ""

        item = ImpactItem(
            requirement_id=req_id,
            requirement_title=req.title,
            document_id=req.location.document_id,
            document_filename=doc_filename,
            char_start=req.location.char_start,
            char_end=req.location.char_end,
            display_label=req.display_label,
            edge_id=edge.id,
            relation_type=edge.relation_type,
            evidence=edge.evidence,
            impact_level=level,
        )

        if level == ImpactLevel.AFFECTED:
            affected_items.append(item)
        else:
            review_items.append(item)

    return ImpactResult(
        changed_requirement_ids=list(changed_ids),
        affected_items=affected_items,
        review_items=review_items,
        total_affected=len(affected_items),
        total_review=len(review_items),
    )
