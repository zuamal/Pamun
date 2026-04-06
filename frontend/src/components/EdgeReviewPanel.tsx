import type { components } from '../api/types.generated'

type Edge = components['schemas']['Edge']
type Requirement = components['schemas']['Requirement']

interface EdgeReviewPanelProps {
  pendingEdges: Edge[]
  requirements: Requirement[]
  onApprove: (edgeId: string) => void
  onReject: (edgeId: string) => void
}

export default function EdgeReviewPanel({
  pendingEdges,
  requirements,
  onApprove,
  onReject,
}: EdgeReviewPanelProps) {
  const reqMap = Object.fromEntries(requirements.map((r) => [r.id, r]))

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 overflow-y-auto h-full box-border">
      <div className="font-bold text-[14px] text-slate-900">
        PENDING Edge 검토
        {pendingEdges.length > 0 && (
          <span className="ml-2 bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs">
            {pendingEdges.length}
          </span>
        )}
      </div>

      {pendingEdges.length === 0 && (
        <div className="text-[13px] text-slate-400 text-center py-4">
          검토할 PENDING Edge가 없습니다
        </div>
      )}

      {pendingEdges.map((edge) => {
        const src = reqMap[edge.source_id]
        const tgt = reqMap[edge.target_id]
        const confidence = Math.round(edge.confidence * 100)
        return (
          <div
            key={edge.id}
            className="border border-orange-200 rounded-lg px-3 py-2.5 bg-orange-50 text-xs"
          >
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="font-semibold text-slate-700">
                {src?.display_label ?? edge.source_id}
              </span>
              <span className="text-slate-500">→</span>
              <span className="font-semibold text-slate-700">
                {tgt?.display_label ?? edge.target_id}
              </span>
              <span
                className={[
                  'ml-auto text-[10px] px-1.5 py-0.5 rounded',
                  edge.relation_type === 'depends_on'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-violet-100 text-violet-700',
                ].join(' ')}
              >
                {edge.relation_type}
              </span>
            </div>

            {src && (
              <div className="text-slate-600 mb-0.5">
                <span className="font-medium">{src.title}</span>
              </div>
            )}
            {tgt && (
              <div className="text-slate-600 mb-1.5">
                <span className="font-medium">→ {tgt.title}</span>
              </div>
            )}

            {edge.evidence && (
              <div className="text-slate-500 italic mb-1.5">
                "{edge.evidence}"
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400">신뢰도 {confidence}%</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onApprove(edge.id)}
                  className="px-2.5 py-0.5 rounded border-none bg-green-500 text-white cursor-pointer text-xs font-semibold"
                >
                  승인
                </button>
                <button
                  onClick={() => onReject(edge.id)}
                  className="px-2.5 py-0.5 rounded border-none bg-red-500 text-white cursor-pointer text-xs font-semibold"
                >
                  거부
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
