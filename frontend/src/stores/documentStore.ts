import { create } from 'zustand'
import type { components } from '../api/types.generated'

type Document = components['schemas']['Document']

interface DocumentStore {
  documents: Document[]
  setDocuments: (docs: Document[]) => void
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  setDocuments: (docs) => set({ documents: docs }),
}))
