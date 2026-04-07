import type { components } from './types.generated'
import { consumeSSE, type ProgressEvent } from './sseTypes'
import {
  isDemoMode,
  patchRequirement,
  demoParseSSE,
  demoDeleteRequirement,
  demoMergeRequirements,
  demoSplitRequirement,
} from '../lib/demoApi'
import { useGraphStore } from '../stores/graphStore'

type Requirement = components['schemas']['Requirement']
type ParseRequest = components['schemas']['ParseRequest']
type RequirementUpdateRequest = components['schemas']['RequirementUpdateRequest']
type RequirementMergeRequest = components['schemas']['RequirementMergeRequest']
type RequirementSplitRequest = components['schemas']['RequirementSplitRequest']

const BASE = '/api'

export async function parseDocumentsSSE(
  body: ParseRequest,
  onProgress: (event: ProgressEvent) => void,
): Promise<void> {
  if (isDemoMode()) return demoParseSSE(onProgress)
  const res = await fetch(`${BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  await consumeSSE(res, onProgress)
}

export async function listRequirements(): Promise<Requirement[]> {
  if (isDemoMode()) return Promise.resolve(useGraphStore.getState().requirements)
  const res = await fetch(`${BASE}/requirements`)
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Requirement[]>
}

export async function updateRequirement(
  id: string,
  body: RequirementUpdateRequest,
): Promise<Requirement> {
  if (isDemoMode()) return Promise.resolve(patchRequirement(id, body))
  const res = await fetch(`${BASE}/requirements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Requirement>
}

export async function mergeRequirements(body: RequirementMergeRequest): Promise<Requirement> {
  if (isDemoMode()) return Promise.resolve(demoMergeRequirements(body.requirement_ids))
  const res = await fetch(`${BASE}/requirements/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Requirement>
}

export async function splitRequirement(body: RequirementSplitRequest): Promise<Requirement[]> {
  if (isDemoMode()) return Promise.resolve(demoSplitRequirement(body.requirement_id, body.split_offset))
  const res = await fetch(`${BASE}/requirements/split`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Requirement[]>
}

export async function deleteRequirement(id: string): Promise<void> {
  if (isDemoMode()) { demoDeleteRequirement(id); return Promise.resolve() }
  const res = await fetch(`${BASE}/requirements/${id}`, { method: 'DELETE' })
  if (!res.ok) { const d = await res.json().catch(() => null) as { detail?: string } | null; throw new Error(d?.detail ?? '요청 실패') }
}
