import type { components } from './types.generated'

type Requirement = components['schemas']['Requirement']
type ParseRequest = components['schemas']['ParseRequest']
type ParseResponse = components['schemas']['ParseResponse']
type RequirementUpdateRequest = components['schemas']['RequirementUpdateRequest']
type RequirementMergeRequest = components['schemas']['RequirementMergeRequest']
type RequirementSplitRequest = components['schemas']['RequirementSplitRequest']

const BASE = '/api'

export async function parseDocuments(body: ParseRequest): Promise<ParseResponse> {
  const res = await fetch(`${BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<ParseResponse>
}

export async function listRequirements(): Promise<Requirement[]> {
  const res = await fetch(`${BASE}/requirements`)
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Requirement[]>
}

export async function updateRequirement(
  id: string,
  body: RequirementUpdateRequest,
): Promise<Requirement> {
  const res = await fetch(`${BASE}/requirements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Requirement>
}

export async function mergeRequirements(body: RequirementMergeRequest): Promise<Requirement> {
  const res = await fetch(`${BASE}/requirements/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Requirement>
}

export async function splitRequirement(body: RequirementSplitRequest): Promise<Requirement[]> {
  const res = await fetch(`${BASE}/requirements/split`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Requirement[]>
}

export async function deleteRequirement(id: string): Promise<void> {
  const res = await fetch(`${BASE}/requirements/${id}`, { method: 'DELETE' })
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
}
