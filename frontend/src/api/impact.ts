import type { components } from './types.generated'

type ImpactResponse = components['schemas']['ImpactResponse']

const BASE = '/api'

export async function getImpact(): Promise<ImpactResponse> {
  const res = await fetch(`${BASE}/impact`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<ImpactResponse>
}
