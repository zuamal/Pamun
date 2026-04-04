import { create } from 'zustand'
import type { components } from '../api/types.generated'

type ImpactResult = components['schemas']['ImpactResult']

interface ImpactStore {
  impactResult: ImpactResult | null
  setImpactResult: (result: ImpactResult | null) => void
}

export const useImpactStore = create<ImpactStore>((set) => ({
  impactResult: null,
  setImpactResult: (result) => set({ impactResult: result }),
}))
