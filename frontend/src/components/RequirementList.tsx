import { useState } from 'react'
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
  onSplit: (req: Requirement) => void
  disabled?: boolean
}

export default function RequirementList({
  requirements,
  documents,
  selectedIds,
  onToggleSelect,
  onTitleUpdate,
  onSplit,
  disabled = false,
}: Props) {
  const docMap = Object.fromEntries(documents.map((d) => [d.id, d]))

  // Group requirements by document_id, preserve document order
  const docIds = [...new Set(requirements.map((r) => r.location.document_id))]
  const groups = docIds.map((docId) => ({
    docId,
    docName: docMap[docId]?.filename ?? docId,
    items: requirements.filter((r) => r.location.document_id === docId),
  }))

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(docIds.map((id) => [id, true]))
  )

  function toggleGroup(docId: string) {
    setOpenGroups((prev) => ({ ...prev, [docId]: !prev[docId] }))
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ docId, docName, items }) => {
        const isOpen = openGroups[docId] ?? true
        const selectedInGroup = items.filter((r) => selectedIds.includes(r.id)).length
        return (
          <div key={docId} className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Accordion header */}
            <button
              onClick={() => toggleGroup(docId)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer border-none"
            >
              <span
                className={[
                  'text-slate-400 text-xs transition-transform duration-200 shrink-0',
                  isOpen ? 'rotate-90' : 'rotate-0',
                ].join(' ')}
              >
                ▶
              </span>
              <span className="flex-1 font-semibold text-sm text-slate-800 truncate">
                📄 {docName}
              </span>
              {selectedInGroup > 0 && (
                <span className="text-[10px] font-bold bg-blue-500 text-white rounded-full px-1.5 py-0.5 shrink-0">
                  {selectedInGroup} 선택
                </span>
              )}
              <span className="text-xs text-slate-400 shrink-0">
                {items.length}개
              </span>
            </button>

            {/* Accordion body */}
            {isOpen && (
              <ul className="list-none p-0 m-0 flex flex-col gap-1.5 p-3">
                {items.map((req) => (
                  <RequirementItem
                    key={req.id}
                    requirement={req}
                    isSelected={selectedIds.includes(req.id)}
                    onToggleSelect={() => onToggleSelect(req.id)}
                    onTitleUpdate={onTitleUpdate}
                    onSplit={onSplit}
                    disabled={disabled}
                  />
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
