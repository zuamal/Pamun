import { type ReactNode } from 'react'
import { useHydrate } from '../hooks/useHydrate'
import Stepper from './Stepper'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const { hydrating } = useHydrate()

  if (hydrating) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">잠시만요...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-slate-200">
          <h1 className="font-bold text-lg text-slate-900 tracking-tight">Pamun</h1>
          <p className="text-xs text-slate-400 mt-0.5">요구사항 의존관계 분석</p>
        </div>
        <Stepper />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
