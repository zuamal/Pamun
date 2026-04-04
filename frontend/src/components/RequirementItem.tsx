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
      style={{
        border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
        borderRadius: 8,
        padding: '0.75rem 1rem',
        marginBottom: '0.5rem',
        background: isSelected ? '#eff6ff' : '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          disabled={disabled}
          style={{ cursor: 'pointer', flexShrink: 0 }}
        />
        {editing ? (
          <input
            ref={inputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
            autoFocus
            style={{
              flex: 1, fontWeight: 600, fontSize: '0.95rem',
              border: '1px solid #3b82f6', borderRadius: 4, padding: '0.15rem 0.4rem',
            }}
          />
        ) : (
          <span
            onClick={() => { if (!disabled) { setEditing(true); setTitleValue(requirement.title) } }}
            title="클릭하여 편집"
            style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem', cursor: disabled ? 'default' : 'text' }}
          >
            {requirement.title}
          </span>
        )}
        <button
          onClick={() => onSplit(requirement)}
          disabled={disabled}
          style={{
            fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 4,
            border: '1px solid #cbd5e1', background: '#f8fafc', cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          분리
        </button>
        <button
          onClick={() => onDelete(requirement.id)}
          disabled={disabled}
          style={{
            fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 4,
            border: '1px solid #fca5a5', color: '#ef4444', background: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          삭제
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', paddingLeft: '1.5rem' }}>
        {preview}
      </p>
      {document && (
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '1.5rem' }}>
          📄 {document.filename}
        </p>
      )}
    </li>
  )
}
