import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGraphStore } from '../stores/graphStore'

interface Step {
  label: string
  path: string
  step: number
}

const STEPS: Step[] = [
  { label: '문서 업로드', path: '/', step: 1 },
  { label: '요구사항 검토', path: '/review', step: 2 },
  { label: '의존관계 그래프', path: '/graph', step: 3 },
  { label: '영향 분석', path: '/impact', step: 4 },
]

const DISABLED_TOOLTIPS: Record<number, string> = {
  2: '먼저 문서를 파싱하세요',
  3: '먼저 문서를 파싱하세요',
  4: '먼저 Edge를 승인하세요',
}

interface StepperProps {
  compact?: boolean
}

export default function Stepper({ compact = false }: StepperProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { requirements, edges } = useGraphStore()
  const [tooltip, setTooltip] = useState<number | null>(null)

  const hasRequirements = requirements.length > 0
  const hasApprovedEdges = edges.some((e) => e.status === 'approved')

  function isEnabled(step: number): boolean {
    if (step === 1) return true
    if (step === 2 || step === 3) return hasRequirements
    if (step === 4) return hasApprovedEdges
    return false
  }

  function handleClick(step: Step) {
    if (!isEnabled(step.step)) {
      setTooltip(step.step)
      setTimeout(() => setTooltip(null), 2000)
      return
    }
    navigate(step.path)
  }

  if (compact) {
    return (
      <nav className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const active = pathname === step.path || (step.path === '/graph' && pathname.startsWith('/graph'))
          const enabled = isEnabled(step.step)
          return (
            <button
              key={step.path}
              onClick={() => handleClick(step)}
              title={step.label}
              className={[
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors',
                active ? 'bg-indigo-600 text-white' : '',
                !active && enabled ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : '',
                !enabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : '',
              ].filter(Boolean).join(' ')}
            >
              {i + 1}
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex flex-col gap-1 p-3 flex-1">
      {STEPS.map((step, i) => {
        const active = pathname === step.path || (step.path === '/graph' && pathname.startsWith('/graph'))
        const enabled = isEnabled(step.step)
        const showTooltip = tooltip === step.step

        return (
          <div key={step.path} className="relative">
            <button
              onClick={() => handleClick(step)}
              className={[
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                active ? 'bg-indigo-50 text-indigo-700 font-semibold' : '',
                !active && enabled ? 'text-slate-700 hover:bg-slate-100 cursor-pointer' : '',
                !enabled ? 'text-slate-400 cursor-not-allowed' : '',
              ].filter(Boolean).join(' ')}
            >
              <span
                className={[
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-colors',
                  active ? 'bg-indigo-600 text-white' : '',
                  !active && enabled ? 'bg-slate-200 text-slate-600' : '',
                  !enabled ? 'bg-slate-100 text-slate-400' : '',
                ].filter(Boolean).join(' ')}
              >
                {i + 1}
              </span>
              <span className="leading-tight">{step.label}</span>
            </button>

            {showTooltip && DISABLED_TOOLTIPS[step.step] && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap z-50 shadow-lg">
                {DISABLED_TOOLTIPS[step.step]}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
