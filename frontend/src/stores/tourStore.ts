import { create } from 'zustand'

interface TourStore {
  isRunning: boolean
  tourKey: number
  setRunning: (v: boolean) => void
  /** Increment tourKey to force-remount Joyride, and set isRunning=true. */
  restartTour: () => void
}

export const useTourStore = create<TourStore>((set) => ({
  isRunning: false,
  tourKey: 0,
  setRunning: (v) => set({ isRunning: v }),
  restartTour: () => set((s) => ({ isRunning: true, tourKey: s.tourKey + 1 })),
}))

export function hasTourBeenSeen(pageName: string): boolean {
  return sessionStorage.getItem(`pamun_tour_seen_${pageName}`) === 'true'
}

export function markTourSeen(pageName: string): void {
  sessionStorage.setItem(`pamun_tour_seen_${pageName}`, 'true')
}

export function resetTourSeen(pageName: string): void {
  sessionStorage.removeItem(`pamun_tour_seen_${pageName}`)
}
