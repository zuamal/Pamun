/**
 * Mock API layer for demo mode (ADR-20).
 * When isDemoMode() is true, these functions replace real backend fetch calls.
 */
import { useDemoStore } from '../stores/demoStore'
import { useDocumentStore } from '../stores/documentStore'
import { useGraphStore } from '../stores/graphStore'
import type { components } from '../api/types.generated'

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

