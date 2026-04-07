import { useState } from 'react'
import type { components } from '../api/types.generated'

type Edge = components['schemas']['Edge']
type Requirement = components['schemas']['Requirement']

interface EdgeReviewPanelProps {
  pendingEdges: Edge[]
  requirements: Requirement[]
  onApprove: (edgeId: string) => void
  onReject: (edgeId: string) => void
  onEdgeHover?: (edgeId: string | null) => void
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return 'bg-green-500'
  if (confidence >= 0.5) return 'bg-amber-400'
  return 'bg-red-400'
}

export default function EdgeReviewPanel({
  pendingEdges,
  requirements,
  onApprove,
  onReject,
  onEdgeHover,
}: EdgeReviewPanelProps) {
  const reqMap = Object.fromEntries(requirements.map((r) => [r.id, r]))
  // Optimistic UI: track locally removed edge IDs
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const visibleEdges = pendingEdges.filter((e) => !removedIds.has(e.id))

  function handleApprove(edgeId: string) {
    setRemovedIds((prev) => new Set([...prev, edgeId]))
    onApprove(edgeId)
  }

  function handleReject(edgeId: string) {
    setRemovedIds((prev) => new Set([...prev, edgeId]))
    onReject(edgeId)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 overflow-y-auto h-full box-border">
      <div className="font-bold text-[14px] text-slate-900 shrink-0">
        PENDING Edge 검토
        {visibleEdges.length > 0 && (
          <span className="ml-2 bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs">
            {visibleEdges.length}
          </span>
        )}
      </div>

      {visibleEdges.length === 0 && (
        <div className="text-[13px] text-slate-400 text-center py-6">
          검토할 PENDING Edge가 없습니다
        </div>
      )}

      {visibleEdges.map((edge) => {
        const src = reqMap[edge.source_id]
        const tgt = reqMap[edge.target_id]
        const confidence = edge.confidence
        const confidencePct = Math.round(confidence * 100)
        return (
          <div
            key={edge.id}
            onMouseEnter={() => onEdgeHover?.(edge.id)}
            onMouseLeave={() => onEdgeHover?.(null)}
            className="border border-orange-200 rounded-xl p-3 bg-orange-50 flex flex-col gap-2"
          >
            {/* Labels */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-slate-800">
                {src?.display_label ?? edge.source_id}
              </span>
              <span className="text-slate-400 text-xs">→</span>
              <span className="font-semibold text-xs text-slate-800">
                {tgt?.display_label ?? edge.target_id}
              </span>
              <span
                className={[
                  'ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium',
                  edge.relation_type === 'depends_on'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-violet-100 text-violet-700',
                ].join(' ')}
              >
                {edge.relation_type}
              </span>
            </div>

            {/* Titles */}
            {src && <div className="text-xs text-slate-600 font-medium">{src.title}</div>}
            {tgt && <div className="text-xs text-slate-600">→ {tgt.title}</div>}

            {edge.evidence && (
              <div className="text-xs text-slate-500 italic">"{edge.evidence}"</div>
            )}

            {/* Confidence bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400">신뢰도</span>
                <span className="text-[10px] font-bold text-slate-600">{confidencePct}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${confidenceColor(confidence)}`}
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleApprove(edge.id)}
                className="flex-1 py-1.5 rounded-lg border-none bg-green-500 text-white cursor-pointer text-xs font-bold hover:bg-green-600 transition-colors"
              >
                ✓ 승인
              </button>
              <button
                onClick={() => handleReject(edge.id)}
                className="flex-1 py-1.5 rounded-lg border-none bg-red-500 text-white cursor-pointer text-xs font-bold hover:bg-red-600 transition-colors"
              >
                ✕ 거부
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
