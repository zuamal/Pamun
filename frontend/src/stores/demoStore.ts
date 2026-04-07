import { create } from 'zustand'

interface DemoStore {
  isDemoMode: boolean
  setIsDemoMode: (v: boolean) => void
}

export const useDemoStore = create<DemoStore>((set) => ({
  isDemoMode: import.meta.env.VITE_DEMO_MODE === 'true',
  setIsDemoMode: (v) => set({ isDemoMode: v }),
}))
