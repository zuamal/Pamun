import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type Edge = components['schemas']['Edge']

interface NodeDetailPanelProps {
  requirement: Requirement | null
  requirements: Requirement[]
  edges: Edge[]
  documents: Record<string, string> // id → filename
  onClose: () => void
  onDeleteEdge: (edgeId: string) => void
}

export default function NodeDetailPanel({
  requirement,
  requirements,
  edges,
  documents,
  onClose,
  onDeleteEdge,
}: NodeDetailPanelProps) {
  if (!requirement) return null

  const reqMap = Object.fromEntries(requirements.map((r) => [r.id, r]))

  const connectedEdges = edges.filter(
    (e) =>
      (e.source_id === requirement.id || e.target_id === requirement.id) &&
      e.status === 'approved',
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 overflow-y-auto h-full box-border">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] text-indigo-500 font-bold mb-0.5">
            {requirement.display_label}
          </div>
          <div className="font-bold text-[15px] text-slate-900">{requirement.title}</div>
        </div>
        <button
          onClick={onClose}
          className="bg-transparent border-none cursor-pointer text-lg text-slate-400 leading-none"
        >
          ×
        </button>
      </div>

      <div>
        <div className="text-[11px] text-slate-500 font-semibold mb-1">소속 문서</div>
        <div className="text-[13px] text-slate-700">
          {documents[requirement.location.document_id] ?? requirement.location.document_id}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-slate-500 font-semibold mb-1">원문</div>
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
          {requirement.original_text}
        </div>
      </div>

      {connectedEdges.length > 0 && (
        <div>
          <div className="text-[11px] text-slate-500 font-semibold mb-2">
            연결된 Edge ({connectedEdges.length})
          </div>
          <div className="flex flex-col gap-2">
            {connectedEdges.map((edge) => {
              const other = edge.source_id === requirement.id
                ? reqMap[edge.target_id]
                : reqMap[edge.source_id]
              const direction = edge.source_id === requirement.id ? '→' : '←'
              return (
                <div
                  key={edge.id}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-blue-500 font-semibold">
                      {direction} {other?.display_label ?? '?'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={[
                          'text-[10px] px-1.5 py-0.5 rounded',
                          edge.relation_type === 'depends_on'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-violet-100 text-violet-700',
                        ].join(' ')}
                      >
                        {edge.relation_type}
                      </span>
                      <button
                        onClick={() => onDeleteEdge(edge.id)}
                        className="bg-transparent border-none cursor-pointer text-red-500 text-sm p-0 leading-none"
                        title="Edge 삭제"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {other && (
                    <div className="text-slate-600 mb-1">{other.title}</div>
                  )}
                  {edge.evidence && (
                    <div className="text-slate-500 italic">"{edge.evidence}"</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {connectedEdges.length === 0 && (
        <div className="text-xs text-slate-400 text-center py-3">
          연결된 Edge 없음
        </div>
      )}
    </div>
  )
}
