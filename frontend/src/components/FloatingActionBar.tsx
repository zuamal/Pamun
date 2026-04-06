interface FloatingActionBarProps {
  selectedCount: number
  onMerge: () => void
  onDelete: () => void
  onDeselect: () => void
  disabled?: boolean
}

export default function FloatingActionBar({
  selectedCount,
  onMerge,
  onDelete,
  onDeselect,
  disabled = false,
}: FloatingActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
        <span className="text-sm font-medium text-slate-300">
          {selectedCount}개 선택됨
        </span>
        <div className="w-px h-5 bg-slate-600" />
        <button
          onClick={onMerge}
          disabled={disabled || selectedCount < 2}
          className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-500 transition-colors cursor-pointer"
        >
          병합
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500 transition-colors cursor-pointer"
        >
          삭제
        </button>
        <button
          onClick={onDeselect}
          className="text-sm px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          선택 해제
        </button>
      </div>
    </div>
  )
}
