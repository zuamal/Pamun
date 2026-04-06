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
    return <p className="text-slate-400 text-sm">파싱된 요구사항이 없습니다.</p>
  }

  return (
    <div>
      {selectedIds.length >= 2 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-slate-600">{selectedIds.length}개 선택됨</span>
          <button
            onClick={() => onMerge(selectedIds)}
            disabled={disabled}
            className="px-3 py-1 rounded-md bg-violet-500 text-white font-semibold text-sm disabled:cursor-not-allowed cursor-pointer"
          >
            병합
          </button>
        </div>
      )}
      <ul className="list-none p-0 m-0">
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
