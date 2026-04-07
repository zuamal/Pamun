import { AnimatePresence, motion } from 'framer-motion'

interface FloatingActionBarProps {
  selectedCount: number
  onMerge: () => void
  onDelete: () => void
  onDeselect: () => void
  disabled?: boolean
}

const springTransition = { type: 'spring', stiffness: 300, damping: 28 } as const

export default function FloatingActionBar({
  selectedCount,
  onMerge,
  onDelete,
  onDeselect,
  disabled = false,
}: FloatingActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          className="fixed bottom-6 left-1/2 z-50"
          style={{ x: '-50%' }}
          initial={{ opacity: 0, y: 64, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={springTransition}
        >
          {/* FR-9.5: Glassmorphism pill */}
          <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-md border border-white/10 text-white px-5 py-3 rounded-2xl shadow-2xl">
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
