import { create } from 'zustand'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type Edge = components['schemas']['Edge']

interface GraphStore {
  // Backend state (cache)
  requirements: Requirement[]
  edges: Edge[]
  setRequirements: (reqs: Requirement[]) => void
  setEdges: (edges: Edge[]) => void

  // Filter state
  hiddenDocIds: string[]
  showPending: boolean
  toggleDocFilter: (docId: string) => void
  setShowPending: (show: boolean) => void

  // Click-to-connect: intermediate source selection
  pendingSource: string | null
  setPendingSource: (id: string | null) => void

  // Edge creation modal (source + target confirmed)
  pendingConnection: { sourceId: string; targetId: string } | null
  setPendingConnection: (conn: { sourceId: string; targetId: string } | null) => void

  // Pinned node positions (survive data refresh)
  pinnedNodes: Record<string, { x: number; y: number }>
  setPinnedNode: (id: string, pos: { x: number; y: number } | null) => void
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  requirements: [],
  edges: [],
  setRequirements: (reqs) => set({ requirements: reqs }),
  setEdges: (edges) => set({ edges }),

  hiddenDocIds: [],
  showPending: true,
  toggleDocFilter: (docId) => {
    const { hiddenDocIds } = get()
    set({
      hiddenDocIds: hiddenDocIds.includes(docId)
        ? hiddenDocIds.filter((id) => id !== docId)
        : [...hiddenDocIds, docId],
    })
  },
  setShowPending: (show) => set({ showPending: show }),

  pendingSource: null,
  setPendingSource: (id) => set({ pendingSource: id }),

  pendingConnection: null,
  setPendingConnection: (conn) => set({ pendingConnection: conn }),

  pinnedNodes: {},
  setPinnedNode: (id, pos) =>
    set((state) => {
      if (pos === null) {
        const next = { ...state.pinnedNodes }
        delete next[id]
        return { pinnedNodes: next }
      }
      return { pinnedNodes: { ...state.pinnedNodes, [id]: pos } }
    }),
}))
