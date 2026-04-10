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
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">잠시만요...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row h-screen overflow-hidden font-sans">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 -z-10" />

      {/* Mobile top bar */}
      <div className="sm:hidden glass-panel border-b px-4 py-2 flex items-center justify-between shrink-0 relative z-10">
        <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">Pamun</span>
        <Stepper compact />
      </div>

      {/* Sidebar (desktop) */}
      <aside className="hidden sm:flex w-56 glass-panel border-r flex-col shrink-0 relative z-10">
        <div className="px-4 py-4 border-b border-white/30 dark:border-slate-600/30">
          <h1 className="font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight">Pamun</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">요구사항 의존관계 분석</p>
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
