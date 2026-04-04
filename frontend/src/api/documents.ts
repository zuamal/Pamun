import type { components } from './types.generated'

type Document = components['schemas']['Document']
type DocumentListResponse = components['schemas']['DocumentListResponse']

const BASE = '/api'

export async function uploadDocuments(files: File[]): Promise<Document[]> {
  const form = new FormData()
  for (const file of files) {
    form.append('files', file)
  }
  const res = await fetch(`${BASE}/documents/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<Document[]>
}

export async function listDocuments(): Promise<DocumentListResponse> {
  const res = await fetch(`${BASE}/documents`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<DocumentListResponse>
}

export async function getDocument(id: string): Promise<Document> {
  const res = await fetch(`${BASE}/documents/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<Document>
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE}/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}
