import { create } from 'zustand'
import type { components } from '../api/types.generated'

type Document = components['schemas']['Document']
type Requirement = components['schemas']['Requirement']
type Edge = components['schemas']['Edge']

export interface PendingBundle {
  documents: Record<string, Document>
  requirements: Record<string, Requirement>
  edges: Record<string, Edge>
}

interface DemoStore {
  isDemoMode: boolean
  setIsDemoMode: (v: boolean) => void
  pendingBundle: PendingBundle | null
  setPendingBundle: (bundle: PendingBundle | null) => void
}

export const useDemoStore = create<DemoStore>((set) => ({
  isDemoMode: import.meta.env.VITE_DEMO_MODE === 'true',
  setIsDemoMode: (v) => set({ isDemoMode: v }),
  pendingBundle: null,
  setPendingBundle: (bundle) => set({ pendingBundle: bundle }),
}))
