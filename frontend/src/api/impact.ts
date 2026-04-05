import type { components } from './types.generated'

type ImpactResponse = components['schemas']['ImpactResponse']
type SessionSaveResponse = components['schemas']['SessionSaveResponse']

const BASE = '/api'

export async function getImpact(): Promise<ImpactResponse> {
  const res = await fetch(`${BASE}/impact`)
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<ImpactResponse>
}

export async function saveSession(): Promise<SessionSaveResponse> {
  const res = await fetch(`${BASE}/session/save`, { method: 'POST' })
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<SessionSaveResponse>
}
