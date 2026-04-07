import type { components } from './types.generated'

type DemoBundleInfo = components['schemas']['DemoBundleInfo']
type DemoLoadResponse = components['schemas']['DemoLoadResponse']

const STATIC_DEMO_BUNDLES: DemoBundleInfo[] = [
  { name: 'BookFlow', description: '독서 앱 기획 문서 3종', file_count: 3 },
  { name: 'LearnHub', description: '학습 플랫폼 기획 문서 5종', file_count: 5 },
  { name: 'MediBook', description: '의료 예약 서비스 기획 문서 4종', file_count: 4 },
]

export async function listDemoBundles(): Promise<DemoBundleInfo[]> {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return Promise.resolve(STATIC_DEMO_BUNDLES)
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
