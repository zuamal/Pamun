import type { components } from '../api/types.generated'
import { DOC_COLORS } from '../utils/docColors'

type Requirement = components['schemas']['Requirement']
type Edge = components['schemas']['Edge']

export interface GraphNode {
  id: string
  label: string
  title: string
  docId: string
  color: string
  approvedCount: number
  status?: 'changed' | 'affected' | 'review_recommended'
  // d3 mutable fields (injected by simulator)
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphLink {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  relationType: 'depends_on' | 'related_to'
  status: 'approved' | 'pending' | 'rejected'
  evidence: string
  confidence: number
}

export function buildGraphData(
  requirements: Requirement[],
  edges: Edge[],
  affectedIds: Set<string>,
  reviewIds: Set<string>,
  pinnedNodes: Record<string, { x: number; y: number }>,
): { nodes: GraphNode[]; links: GraphLink[] } {
  const docIds = [...new Set(requirements.map((r) => r.location.document_id))]
  const colorMap = Object.fromEntries(
    docIds.map((id, i) => [id, DOC_COLORS[i % DOC_COLORS.length]]),
  )

  const approvedEdges = edges.filter((e) => e.status === 'approved')

  const nodes: GraphNode[] = requirements.map((req) => {
    const pinned = pinnedNodes[req.id]
    return {
      id: req.id,
      label: req.display_label,
      title: req.title,
      docId: req.location.document_id,
      color: colorMap[req.location.document_id] ?? '#6366f1',
      approvedCount: approvedEdges.filter(
        (e) => e.source_id === req.id || e.target_id === req.id,
      ).length,
      status: req.changed
        ? 'changed'
        : affectedIds.has(req.id)
          ? 'affected'
          : reviewIds.has(req.id)
            ? 'review_recommended'
            : undefined,
      // Inject pinned position as fixed coordinates
      fx: pinned ? pinned.x : undefined,
      fy: pinned ? pinned.y : undefined,
    }
  })

  const links: GraphLink[] = edges
    .filter((e) => e.status !== 'rejected')
    .map((e) => ({
      id: e.id,
      source: e.source_id,
      target: e.target_id,
      relationType: e.relation_type,
      status: e.status,
      evidence: e.evidence ?? '',
      confidence: e.confidence,
    }))

  return { nodes, links }
}
