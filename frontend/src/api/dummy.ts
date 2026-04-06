import type { components } from './types.generated'

type BundleInfo = components['schemas']['BundleInfo']
type Document = components['schemas']['Document']

export async function listBundles(): Promise<BundleInfo[]> {
  const resp = await fetch('/api/dummy/bundles')
  if (!resp.ok) throw new Error('번들 목록을 불러오지 못했습니다.')
  return resp.json() as Promise<BundleInfo[]>
}

export async function loadBundle(name: string): Promise<Document[]> {
  const resp = await fetch(`/api/dummy/load/${encodeURIComponent(name)}`, { method: 'POST' })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? '번들 적재에 실패했습니다.')
  }
  return resp.json() as Promise<Document[]>
}
