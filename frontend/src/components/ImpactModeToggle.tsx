interface ImpactModeToggleProps {
  active: boolean
  onToggle: () => void
}

export default function ImpactModeToggle({ active, onToggle }: ImpactModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all cursor-pointer',
        active
          ? 'bg-red-500 border-red-500 text-white hover:bg-red-600'
          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50',
      ].join(' ')}
    >
      <span
        className={[
          'w-2 h-2 rounded-full shrink-0',
          active ? 'bg-white animate-pulse' : 'bg-slate-400',
        ].join(' ')}
      />
      영향 분석 모드
    </button>
  )
}
