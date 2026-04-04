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
}

export const useGraphStore = create<GraphStore>((set) => ({
  requirements: [],
  edges: [],
  setRequirements: (reqs) => set({ requirements: reqs }),
  setEdges: (edges) => set({ edges }),

  zoom: 1,
  layout: 'dagre',
  setZoom: (zoom) => set({ zoom }),
  setLayout: (layout) => set({ layout }),
}))
