import type { components } from './types.generated'
import { consumeSSE, type ProgressEvent } from './sseTypes'
import { isDemoMode, patchEdge, demoInferSSE } from '../lib/demoApi'
import { useGraphStore } from '../stores/graphStore'

type Edge = components['schemas']['Edge']
type EdgeStatus = components['schemas']['EdgeStatus']
type EdgeInferRequest = components['schemas']['EdgeInferRequest']
type EdgeCreateRequest = components['schemas']['EdgeCreateRequest']
type EdgeUpdateRequest = components['schemas']['EdgeUpdateRequest']
type EdgeListResponse = components['schemas']['EdgeListResponse']

const BASE = '/api'

export async function inferEdgesSSE(
  body: EdgeInferRequest,
  onProgress: (event: ProgressEvent) => void,
): Promise<void> {
  if (isDemoMode()) return demoInferSSE(onProgress)
  const res = await fetch(`${BASE}/edges/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  await consumeSSE(res, onProgress)
}

export async function listEdges(status?: EdgeStatus): Promise<EdgeListResponse> {
  if (isDemoMode()) {
    const edges = useGraphStore.getState().edges
    const filtered = status ? edges.filter((e) => e.status === status) : edges
    return Promise.resolve({ edges: filtered })
  }
  const url = status ? `${BASE}/edges?status=${status}` : `${BASE}/edges`
  const res = await fetch(url)
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<EdgeListResponse>
}

export async function createEdge(body: EdgeCreateRequest): Promise<Edge> {
  if (isDemoMode()) {
    const newEdge: Edge = {
      id: crypto.randomUUID(),
      source_id: body.source_id,
      target_id: body.target_id,
      relation_type: body.relation_type,
      evidence: body.evidence,
      confidence: 1.0,
      status: 'approved',
    }
    const { edges, setEdges } = useGraphStore.getState()
    setEdges([...edges, newEdge])
    return Promise.resolve(newEdge)
  }
  const res = await fetch(`${BASE}/edges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Edge>
}

export async function updateEdge(id: string, body: EdgeUpdateRequest): Promise<Edge> {
  if (isDemoMode()) return Promise.resolve(patchEdge(id, body))
  const res = await fetch(`${BASE}/edges/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Edge>
}

export async function deleteEdge(id: string): Promise<void> {
  if (isDemoMode()) {
    const { edges, setEdges } = useGraphStore.getState()
    setEdges(edges.filter((e) => e.id !== id))
    return Promise.resolve()
  }
  const res = await fetch(`${BASE}/edges/${id}`, { method: 'DELETE' })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
}
