import { useState, useMemo } from 'react'
import { useGraphStore } from '../stores/graphStore'
import { DOC_COLORS } from '../utils/docColors'

interface GraphLegendProps {
  /** document id → filename */
  documents: Record<string, string>
  showImpactLegend?: boolean
}

export default function GraphLegend({ documents, showImpactLegend = false }: GraphLegendProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { requirements, hiddenDocIds } = useGraphStore()

  // Compute doc color map identical to RequirementGraph (use all requirements for consistent ordering)
  const docEntries = useMemo(() => {
    const allIds = [...new Set(requirements.map((r) => r.location.document_id))]
    return allIds
      .filter((id) => !hiddenDocIds.includes(id))
      .map((id, _i) => {
        const colorIndex = allIds.indexOf(id)
        return {
          id,
          color: DOC_COLORS[colorIndex % DOC_COLORS.length],
          filename: documents[id] ?? id,
        }
      })
  }, [requirements, hiddenDocIds, documents])

  return (
    <div
      className="absolute bottom-3 left-3 bg-white border border-slate-200 rounded-lg shadow-md text-xs select-none"
      style={{ zIndex: 10, minWidth: 140, maxWidth: 220 }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-600 font-semibold bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-50 transition-colors"
      >
        <span>범례</span>
        <span className="text-slate-400">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-2.5">
          {/* Edge styles */}
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Edge 유형</div>
            <div className="flex items-center gap-2">
              <svg width="28" height="10">
                <line x1="0" y1="5" x2="28" y2="5" stroke="#3b82f6" strokeWidth="2" />
                <polygon points="22,2 28,5 22,8" fill="#3b82f6" />
              </svg>
              <span className="text-slate-600">depends_on</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="28" height="10">
                <line x1="0" y1="5" x2="28" y2="5" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4,3" />
                <polygon points="22,2 28,5 22,8" fill="#8b5cf6" />
                <polygon points="6,2 0,5 6,8" fill="#8b5cf6" />
              </svg>
              <span className="text-slate-600">related_to</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="28" height="10">
                <line x1="0" y1="5" x2="28" y2="5" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,3" opacity={0.5} />
                <polygon points="22,2 28,5 22,8" fill="#94a3b8" opacity={0.5} />
              </svg>
              <span className="text-slate-500">PENDING</span>
            </div>
          </div>

          {/* Impact status — only when showImpactLegend */}
          {showImpactLegend && (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">영향 상태</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-slate-600">changed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-slate-600">affected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                <span className="text-slate-600">review_recommended</span>
              </div>
            </div>
          )}

          {/* Document colors — pill badges */}
          {docEntries.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">문서</div>
              {docEntries.map((entry) => {
                const shortName = entry.filename.length > 8 ? entry.filename.slice(0, 8) + '…' : entry.filename
                return (
                  <span
                    key={entry.id}
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-white inline-block truncate max-w-full"
                    style={{ backgroundColor: entry.color }}
                    title={entry.filename}
                  >
                    {shortName}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
