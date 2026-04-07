import type { components } from './types.generated'
import { isDemoMode, getDocument as demoGetDocument } from '../lib/demoApi'
import { useDocumentStore } from '../stores/documentStore'

type Document = components['schemas']['Document']
type DocumentListResponse = components['schemas']['DocumentListResponse']

const BASE = '/api'

export async function uploadDocuments(files: File[]): Promise<Document[]> {
  const form = new FormData()
  for (const file of files) {
    form.append('files', file)
  }
  const res = await fetch(`${BASE}/documents/upload`, { method: 'POST', body: form })
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Document[]>
}

export async function listDocuments(): Promise<DocumentListResponse> {
  if (isDemoMode()) {
    return Promise.resolve({ documents: useDocumentStore.getState().documents })
  }
  const res = await fetch(`${BASE}/documents`)
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<DocumentListResponse>
}

export async function getDocument(id: string): Promise<Document> {
  if (isDemoMode()) return Promise.resolve(demoGetDocument(id))
  const res = await fetch(`${BASE}/documents/${id}`)
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
  return res.json() as Promise<Document>
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE}/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail ?? '요청 실패') }
}
