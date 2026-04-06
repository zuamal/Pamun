import type { components } from '../api/types.generated'
import { useGraphStore } from '../stores/graphStore'

type Requirement = components['schemas']['Requirement']

interface GraphFilterProps {
  requirements: Requirement[]
  documents: Record<string, string> // id → filename
}

export default function GraphFilter({ requirements, documents }: GraphFilterProps) {
  const { hiddenDocIds, showPending, toggleDocFilter, setShowPending } = useGraphStore()

  const docIds = [...new Set(requirements.map((r) => r.location.document_id))]

  if (docIds.length === 0) return null

  return (
    <div className="flex flex-col gap-3 p-3 border-t border-slate-200">
      {/* Document filter */}
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">문서 필터</div>
        <div className="flex flex-col gap-1.5">
          {docIds.map((docId) => {
            const visible = !hiddenDocIds.includes(docId)
            return (
              <label key={docId} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => toggleDocFilter(docId)}
                  className="accent-indigo-500 shrink-0"
                />
                <span className="text-xs text-slate-700 truncate">
                  {documents[docId] ?? docId}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Edge status filter */}
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Edge 표시</div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPending}
            onChange={(e) => setShowPending(e.target.checked)}
            className="accent-amber-500 shrink-0"
          />
          <span className="text-xs text-slate-700">PENDING 표시</span>
        </label>
      </div>
    </div>
  )
}
