import type { components } from './types.generated'

type DemoBundleInfo = components['schemas']['DemoBundleInfo']
type DemoLoadResponse = components['schemas']['DemoLoadResponse']

export async function listDemoBundles(): Promise<DemoBundleInfo[]> {
  const resp = await fetch('/api/demo/bundles')
  if (!resp.ok) throw new Error('데모 번들 목록을 불러오지 못했습니다.')
  return resp.json() as Promise<DemoBundleInfo[]>
}

export async function loadDemoBundle(name: string): Promise<DemoLoadResponse> {
  const resp = await fetch(`/api/demo/load/${encodeURIComponent(name)}`, { method: 'POST' })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? '데모 번들 적재에 실패했습니다.')
  }
  return resp.json() as Promise<DemoLoadResponse>
}
