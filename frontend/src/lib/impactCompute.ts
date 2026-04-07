/**
 * Client-side 1-hop impact analysis (ADR-6 / ADR-20).
 * Mirrors backend/app/services/impact_service.py exactly.
 *
 * Policy:
 *   related_to  : undirected — both sides AFFECTED
 *   depends_on  : target changed → source AFFECTED
 *                 source changed → target REVIEW_RECOMMENDED
 */
import { useDocumentStore } from '../stores/documentStore'
import { useGraphStore } from '../stores/graphStore'
import type { components } from '../api/types.generated'

type ImpactResult = components['schemas']['ImpactResult']
type ImpactItem = components['schemas']['ImpactItem']
type ImpactLevel = components['schemas']['ImpactLevel']
type Edge = components['schemas']['Edge']

const LEVEL_PRIORITY: Record<ImpactLevel, number> = {
  affected: 1,
  review_recommended: 0,
}

export function computeImpact(): ImpactResult {
  const { requirements, edges } = useGraphStore.getState()
  const { documents } = useDocumentStore.getState()

  const changedIds = new Set(requirements.filter((r) => r.changed).map((r) => r.id))
  const docFilename: Record<string, string> = {}
  for (const doc of documents) docFilename[doc.id] = doc.filename

  const approvedEdges = edges.filter((e) => e.status === 'approved')

  // reqId → { level, edge }
  const impactMap = new Map<string, { level: ImpactLevel; edge: Edge }>()

  function record(reqId: string, level: ImpactLevel, edge: Edge) {
    if (changedIds.has(reqId)) return
    if (!requirements.find((r) => r.id === reqId)) return

    const existing = impactMap.get(reqId)
    if (!existing || LEVEL_PRIORITY[level] > LEVEL_PRIORITY[existing.level]) {
      impactMap.set(reqId, { level, edge })
    }
  }

  for (const edge of approvedEdges) {
    const srcChanged = changedIds.has(edge.source_id)
    const tgtChanged = changedIds.has(edge.target_id)

    if (edge.relation_type === 'related_to') {
      if (srcChanged) record(edge.target_id, 'affected', edge)
      if (tgtChanged) record(edge.source_id, 'affected', edge)
    } else if (edge.relation_type === 'depends_on') {
      if (tgtChanged) record(edge.source_id, 'affected', edge)
      if (srcChanged) record(edge.target_id, 'review_recommended', edge)
    }
  }

  const affectedItems: ImpactItem[] = []
  const reviewItems: ImpactItem[] = []

  for (const [reqId, { level, edge }] of impactMap.entries()) {
    const req = requirements.find((r) => r.id === reqId)!
    const item: ImpactItem = {
      requirement_id: reqId,
      requirement_title: req.title,
      document_id: req.location.document_id,
      document_filename: docFilename[req.location.document_id] ?? '',
      char_start: req.location.char_start,
      char_end: req.location.char_end,
      display_label: req.display_label,
      edge_id: edge.id,
      relation_type: edge.relation_type,
      evidence: edge.evidence,
      impact_level: level,
    }
    if (level === 'affected') affectedItems.push(item)
    else reviewItems.push(item)
  }

  return {
    changed_requirement_ids: [...changedIds],
    affected_items: affectedItems,
    review_items: reviewItems,
    total_affected: affectedItems.length,
    total_review: reviewItems.length,
  }
}
