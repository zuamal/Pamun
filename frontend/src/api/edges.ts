import type { components } from './types.generated'
import { consumeSSE, type ProgressEvent } from './sseTypes'

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
  const res = await fetch(`${BASE}/edges/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  await consumeSSE(res, onProgress)
}

export async function listEdges(status?: EdgeStatus): Promise<EdgeListResponse> {
  const url = status ? `${BASE}/edges?status=${status}` : `${BASE}/edges`
  const res = await fetch(url)
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<EdgeListResponse>
}

export async function createEdge(body: EdgeCreateRequest): Promise<Edge> {
  const res = await fetch(`${BASE}/edges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Edge>
}

export async function updateEdge(id: string, body: EdgeUpdateRequest): Promise<Edge> {
  const res = await fetch(`${BASE}/edges/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Edge>
}

export async function deleteEdge(id: string): Promise<void> {
  const res = await fetch(`${BASE}/edges/${id}`, { method: 'DELETE' })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
}
