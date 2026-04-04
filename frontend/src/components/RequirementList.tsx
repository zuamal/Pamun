import type { components } from '../api/types.generated'
import RequirementItem from './RequirementItem'

type Requirement = components['schemas']['Requirement']
type Document = components['schemas']['Document']

interface Props {
  requirements: Requirement[]
  documents: Document[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onTitleUpdate: (id: string, title: string) => void
  onDelete: (id: string) => void
  onSplit: (req: Requirement) => void
  onMerge: (ids: string[]) => void
  disabled?: boolean
}

export default function RequirementList({
  requirements,
  documents,
  selectedIds,
  onToggleSelect,
  onTitleUpdate,
  onDelete,
  onSplit,
  onMerge,
  disabled = false,
}: Props) {
  const docMap = Object.fromEntries(documents.map((d) => [d.id, d]))

  if (requirements.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>파싱된 요구사항이 없습니다.</p>
  }

  return (
    <div>
      {selectedIds.length >= 2 && (
        <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#475569' }}>
            {selectedIds.length}개 선택됨
          </span>
          <button
            onClick={() => onMerge(selectedIds)}
            disabled={disabled}
            style={{
              padding: '0.3rem 0.9rem', borderRadius: 6, border: 'none',
              background: '#8b5cf6', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '0.875rem',
            }}
          >
            병합
          </button>
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {requirements.map((req) => (
          <RequirementItem
            key={req.id}
            requirement={req}
            document={docMap[req.location.document_id]}
            isSelected={selectedIds.includes(req.id)}
            onToggleSelect={() => onToggleSelect(req.id)}
            onTitleUpdate={onTitleUpdate}
            onDelete={onDelete}
            onSplit={onSplit}
            disabled={disabled}
          />
        ))}
      </ul>
    </div>
  )
}
