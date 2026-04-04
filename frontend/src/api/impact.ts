import type { components } from './types.generated'

type ImpactResponse = components['schemas']['ImpactResponse']

const BASE = '/api'

export async function getImpact(): Promise<ImpactResponse> {
  const res = await fetch(`${BASE}/impact`)
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<ImpactResponse>
}
