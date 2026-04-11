import { useState } from 'react'
import type { components } from '../api/types.generated'
import { DOC_COLORS } from '../utils/docColors'

type Edge = components['schemas']['Edge']
type Requirement = components['schemas']['Requirement']

interface EdgeReviewPanelProps {
  pendingEdges: Edge[]
  requirements: Requirement[]
  documents: Record<string, string> // id → filename
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
  documents,
  onApprove,
  onReject,
  onEdgeHover,
}: EdgeReviewPanelProps) {
  const reqMap = Object.fromEntries(requirements.map((r) => [r.id, r]))

  // Build doc → color map (consistent with graphAdapter ordering)
  const docIds = [...new Set(requirements.map((r) => r.location.document_id))]
  const docColorMap = Object.fromEntries(
    docIds.map((id, i) => [id, DOC_COLORS[i % DOC_COLORS.length]]),
  )

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
    <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 overflow-y-auto h-full box-border">
      <div className="font-bold text-[14px] text-slate-900 dark:text-slate-100 shrink-0">
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
        const srcDocId = src?.location.document_id
        const tgtDocId = tgt?.location.document_id
        const srcColor = srcDocId ? (docColorMap[srcDocId] ?? '#6366f1') : '#6366f1'
        const tgtColor = tgtDocId ? (docColorMap[tgtDocId] ?? '#6366f1') : '#6366f1'
        const srcFilename = srcDocId ? (documents[srcDocId] ?? srcDocId) : ''
        const tgtFilename = tgtDocId ? (documents[tgtDocId] ?? tgtDocId) : ''
        const srcShort = srcFilename.length > 8 ? srcFilename.slice(0, 8) + '…' : srcFilename
        const tgtShort = tgtFilename.length > 8 ? tgtFilename.slice(0, 8) + '…' : tgtFilename
        return (
          <div
            key={edge.id}
            onMouseEnter={() => onEdgeHover?.(edge.id)}
            onMouseLeave={() => onEdgeHover?.(null)}
            className="border border-orange-200 rounded-xl p-3 bg-orange-50/80 dark:bg-orange-950/30 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          >
            {/* Labels */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                {src?.display_label ?? edge.source_id}
              </span>
              <span className="text-slate-400 text-xs">→</span>
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
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

            {/* Doc pill badges */}
            {(srcFilename || tgtFilename) && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {srcFilename && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: srcColor }}
                    title={srcFilename}
                  >
                    {srcShort}
                  </span>
                )}
                {tgtFilename && tgtDocId !== srcDocId && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: tgtColor }}
                    title={tgtFilename}
                  >
                    {tgtShort}
                  </span>
                )}
              </div>
            )}

            {/* Titles */}
            {src && <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">{src.title}</div>}
            {tgt && <div className="text-xs text-slate-600 dark:text-slate-400">→ {tgt.title}</div>}

            {edge.evidence && (
              <div className="text-xs text-slate-500 italic">"{edge.evidence}"</div>
            )}

            {/* Confidence bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400">신뢰도</span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{confidencePct}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
                className="flex-1 py-1.5 rounded-lg border-none bg-green-500 text-white cursor-pointer text-xs font-bold hover:bg-green-600 transition-all duration-150"
              >
                ✓ 승인
              </button>
              <button
                onClick={() => handleReject(edge.id)}
                className="flex-1 py-1.5 rounded-lg border-none bg-red-500 text-white cursor-pointer text-xs font-bold hover:bg-red-600 transition-all duration-150"
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
