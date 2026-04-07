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

  // Frontend-only graph state
  zoom: number
  layout: 'dagre' | 'force'
  setZoom: (zoom: number) => void
  setLayout: (layout: 'dagre' | 'force') => void

  // Filter state
  hiddenDocIds: string[]
  showPending: boolean
  toggleDocFilter: (docId: string) => void
  setShowPending: (show: boolean) => void

  // Pending handle-drag connection
  pendingConnection: { sourceId: string; targetId: string } | null
  setPendingConnection: (conn: { sourceId: string; targetId: string } | null) => void
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  requirements: [],
  edges: [],
  setRequirements: (reqs) => set({ requirements: reqs }),
  setEdges: (edges) => set({ edges }),

  zoom: 1,
  layout: 'dagre',
  setZoom: (zoom) => set({ zoom }),
  setLayout: (layout) => set({ layout }),

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

  pendingConnection: null,
  setPendingConnection: (conn) => set({ pendingConnection: conn }),
}))
