import { useRef, useState } from 'react'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type Document = components['schemas']['Document']

interface Props {
  requirement: Requirement
  document: Document | undefined
  isSelected: boolean
  onToggleSelect: () => void
  onTitleUpdate: (id: string, title: string) => void
  onDelete: (id: string) => void
  onSplit: (req: Requirement) => void
  disabled?: boolean
}

export default function RequirementItem({
  requirement,
  document,
  isSelected,
  onToggleSelect,
  onTitleUpdate,
  onDelete,
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

  const preview = requirement.original_text.slice(0, 100) + (requirement.original_text.length > 100 ? '…' : '')

  return (
    <li
      className={[
        'border rounded-lg px-4 py-3 mb-2 flex flex-col gap-1.5',
        isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          disabled={disabled}
          className="cursor-pointer shrink-0"
        />
        {editing ? (
          <input
            ref={inputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
            autoFocus
            className="flex-1 font-semibold text-[0.95rem] border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none"
          />
        ) : (
          <span
            onClick={() => { if (!disabled) { setEditing(true); setTitleValue(requirement.title) } }}
            title="클릭하여 편집"
            className={['flex-1 font-semibold text-[0.95rem]', disabled ? 'cursor-default' : 'cursor-text'].join(' ')}
          >
            {requirement.title}
          </span>
        )}
        <button
          onClick={() => onSplit(requirement)}
          disabled={disabled}
          className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-slate-50 disabled:cursor-not-allowed cursor-pointer"
        >
          분리
        </button>
        <button
          onClick={() => onDelete(requirement.id)}
          disabled={disabled}
          className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-500 bg-transparent disabled:cursor-not-allowed cursor-pointer"
        >
          삭제
        </button>
      </div>
      <p className="m-0 text-sm text-slate-500 pl-6">{preview}</p>
      {document && (
        <p className="m-0 text-xs text-slate-400 pl-6">📄 {document.filename}</p>
      )}
    </li>
  )
}
