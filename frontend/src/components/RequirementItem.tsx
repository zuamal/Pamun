import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']

interface Props {
  requirement: Requirement
  isSelected: boolean
  onToggleSelect: () => void
  onTitleUpdate: (id: string, title: string) => void
  onSplit: (req: Requirement) => void
  disabled?: boolean
}

export default function RequirementItem({
  requirement,
  isSelected,
  onToggleSelect,
  onTitleUpdate,
  onSplit,
  disabled = false,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(requirement.title)
  const inputRef = useRef<HTMLInputElement>(null)

  function commitEdit() {
    setEditing(false)
    if (titleValue.trim() && titleValue !== requirement.title) {
      onTitleUpdate(requirement.id, titleValue.trim())
    } else {
      setTitleValue(requirement.title)
    }
  }

  const preview = requirement.original_text.slice(0, 120) + (requirement.original_text.length > 120 ? '…' : '')

  return (
    <motion.li
      layout
      layoutId={requirement.id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={[
        'border rounded-lg px-4 py-3 flex flex-col gap-1.5 transition-colors',
        isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          disabled={disabled}
          className="cursor-pointer shrink-0 accent-blue-500"
        />
        <span className="text-[11px] font-bold text-indigo-500 shrink-0">
          {requirement.display_label}
        </span>
        {editing ? (
          <input
            ref={inputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
            autoFocus
            className="flex-1 font-semibold text-sm border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none"
          />
        ) : (
          <span
            onClick={() => { if (!disabled) { setEditing(true); setTitleValue(requirement.title) } }}
            title="클릭하여 편집"
            className={['flex-1 font-semibold text-sm text-slate-900', disabled ? 'cursor-default' : 'cursor-text'].join(' ')}
          >
            {requirement.title}
          </span>
        )}
        <button
          onClick={() => onSplit(requirement)}
          disabled={disabled}
          className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-600 disabled:cursor-not-allowed cursor-pointer hover:bg-slate-100 transition-colors shrink-0"
        >
          분리
        </button>
      </div>
      <p className="m-0 text-xs text-slate-500 pl-[calc(1rem+0.5rem+1px)] line-clamp-2">{preview}</p>
    </motion.li>
  )
}
