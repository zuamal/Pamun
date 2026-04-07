/**
 * Mock API layer for demo mode (ADR-20).
 * When isDemoMode() is true, these functions replace real backend fetch calls.
 */
import { useDemoStore } from '../stores/demoStore'
import { useDocumentStore } from '../stores/documentStore'
import { useGraphStore } from '../stores/graphStore'
import type { components } from '../api/types.generated'
import type { ProgressEvent } from '../api/sseTypes'

type Requirement = components['schemas']['Requirement']
type Edge = components['schemas']['Edge']
type RequirementUpdateRequest = components['schemas']['RequirementUpdateRequest']
type EdgeUpdateRequest = components['schemas']['EdgeUpdateRequest']
type Document = components['schemas']['Document']

/** Returns true when running in GitHub Pages demo mode or after a demo bundle is loaded. */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true' || useDemoStore.getState().isDemoMode
}

/** Update a requirement in graphStore without hitting the backend. */
export function patchRequirement(id: string, data: RequirementUpdateRequest): Requirement {
  const store = useGraphStore.getState()
  const req = store.requirements.find((r) => r.id === id)
  if (!req) throw new Error(`Requirement not found: ${id}`)
  const updated: Requirement = {
    ...req,
    ...(data.title != null ? { title: data.title } : {}),
    ...(data.changed != null ? { changed: data.changed } : {}),
  }
  store.setRequirements(store.requirements.map((r) => (r.id === id ? updated : r)))
  return updated
}

/** Delete a requirement from graphStore without hitting the backend. */
export function demoDeleteRequirement(id: string): void {
  const store = useGraphStore.getState()
  store.setRequirements(store.requirements.filter((r) => r.id !== id))
  store.setEdges(store.edges.filter((e) => e.source_id !== id && e.target_id !== id))
}

/** Merge requirements in graphStore without hitting the backend. */
export function demoMergeRequirements(ids: string[]): Requirement {
  const store = useGraphStore.getState()
  const toMerge = ids
    .map((id) => store.requirements.find((r) => r.id === id))
    .filter((r): r is Requirement => r != null)
  if (toMerge.length === 0) throw new Error('요구사항을 찾을 수 없습니다')
  const first = toMerge[0]
  const merged: Requirement = {
    id: crypto.randomUUID(),
    title: toMerge.map((r) => r.title).join(' / '),
    original_text: toMerge.map((r) => r.original_text).join('\n\n'),
    location: {
      document_id: first.location.document_id,
      char_start: Math.min(...toMerge.map((r) => r.location.char_start)),
      char_end: Math.max(...toMerge.map((r) => r.location.char_end)),
    },
    display_label: first.display_label,
    changed: false,
  }
  store.setRequirements([...store.requirements.filter((r) => !ids.includes(r.id)), merged])
  store.setEdges(store.edges.filter((e) => !ids.includes(e.source_id) && !ids.includes(e.target_id)))
  return merged
}

/** Split a requirement in graphStore without hitting the backend. */
export function demoSplitRequirement(id: string, splitOffset: number): Requirement[] {
  const store = useGraphStore.getState()
  const req = store.requirements.find((r) => r.id === id)
  if (!req) throw new Error(`Requirement not found: ${id}`)
  const part1: Requirement = {
    id: crypto.randomUUID(),
    title: req.title + ' (1)',
    original_text: req.original_text.slice(0, splitOffset),
    location: {
      document_id: req.location.document_id,
      char_start: req.location.char_start,
      char_end: req.location.char_start + splitOffset,
    },
    display_label: req.display_label,
    changed: false,
  }
  const part2: Requirement = {
    id: crypto.randomUUID(),
    title: req.title + ' (2)',
    original_text: req.original_text.slice(splitOffset),
    location: {
      document_id: req.location.document_id,
      char_start: req.location.char_start + splitOffset,
      char_end: req.location.char_end,
    },
    display_label: req.display_label,
    changed: false,
  }
  store.setRequirements([...store.requirements.filter((r) => r.id !== id), part1, part2])
  store.setEdges(store.edges.filter((e) => e.source_id !== id && e.target_id !== id))
  return [part1, part2]
}

/** Update an edge in graphStore without hitting the backend. */
export function patchEdge(id: string, data: EdgeUpdateRequest): Edge {
  const store = useGraphStore.getState()
  const edge = store.edges.find((e) => e.id === id)
  if (!edge) throw new Error(`Edge not found: ${id}`)
  const updated: Edge = {
    ...edge,
    ...(data.status != null ? { status: data.status } : {}),
    ...(data.relation_type != null ? { relation_type: data.relation_type } : {}),
    ...(data.evidence != null ? { evidence: data.evidence } : {}),
  }
  store.setEdges(store.edges.map((e) => (e.id === id ? updated : e)))
  return updated
}

/** Return a document from documentStore without hitting the backend. */
export function getDocument(id: string): Document {
  const { documents } = useDocumentStore.getState()
  const doc = documents.find((d) => d.id === id)
  if (!doc) throw new Error(`Document not found: ${id}`)
  return doc
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Fake parse SSE — replays progress events and commits requirements to graphStore. */
export async function demoParseSSE(onProgress: (event: ProgressEvent) => void): Promise<void> {
  onProgress({ step: 'preparing', message: '파싱 준비 중...', progress: 0 })
  await delay(600)
  onProgress({ step: 'parsing', message: '문서 분석 중...', progress: 40 })
  await delay(800)
  onProgress({ step: 'saving', message: '요구사항 저장 중...', progress: 80 })
  await delay(600)
  // Commit requirements before done event
  const { pendingBundle } = useDemoStore.getState()
  if (pendingBundle) {
    useGraphStore.getState().setRequirements(Object.values(pendingBundle.requirements))
  }
  onProgress({ step: 'done', message: '파싱 완료', progress: 100 })
}

/** Fake infer SSE — replays progress events and commits edges to graphStore. */
export async function demoInferSSE(onProgress: (event: ProgressEvent) => void): Promise<void> {
  onProgress({ step: 'preparing', message: '추론 준비 중...', progress: 0 })
  await delay(700)
  onProgress({ step: 'inferring', message: '의존관계 분석 중...', progress: 45 })
  await delay(800)
  onProgress({ step: 'saving', message: 'Edge 생성 중...', progress: 85 })
  await delay(700)
  // Commit edges before done event
  const { pendingBundle } = useDemoStore.getState()
  if (pendingBundle) {
    useGraphStore.getState().setEdges(Object.values(pendingBundle.edges))
  }
  onProgress({ step: 'done', message: '추론 완료', progress: 100 })
}
