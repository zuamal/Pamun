import { memo } from 'react'
import { Handle, Position, useStore } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { components } from '../api/types.generated'
import { useGraphStore } from '../stores/graphStore'

type Requirement = components['schemas']['Requirement']

export type ImpactStatus = 'changed' | 'affected' | 'review' | null

export interface RequirementNodeData {
  requirement: Requirement
  docColor: string
  selected: boolean
  impactMode: boolean
  impactStatus: ImpactStatus
  edgeCount: number
}

// Impact mode visual config
const IMPACT_STYLES: Record<NonNullable<ImpactStatus>, { border: string; bg: string; ring: string }> = {
  changed: { border: '#f59e0b', bg: '#fff7ed', ring: '0 0 0 2px #f59e0b, 0 1px 4px rgba(0,0,0,0.12)' },
  affected: { border: '#ef4444', bg: '#fef2f2', ring: '0 0 0 2px #ef4444, 0 1px 4px rgba(0,0,0,0.12)' },
  review:   { border: '#eab308', bg: '#fefce8', ring: '0 0 0 2px #eab308, 0 1px 4px rgba(0,0,0,0.12)' },
}

const RequirementNode = memo(({ data, id }: NodeProps) => {
  const { requirement, docColor, selected, impactMode, impactStatus, edgeCount } = data as unknown as RequirementNodeData

  // FR-9.6: Detect when this node's target handle is within the snap radius
  const isSnappedTarget = useStore((s) => {
    const conn = s.connection
    return (
      'inProgress' in conn &&
      (conn as { inProgress: boolean; isValid: boolean | null; to: { nodeId: string } | null }).inProgress === true &&
      (conn as { inProgress: boolean; isValid: boolean | null; to: { nodeId: string } | null }).isValid === true &&
      (conn as { inProgress: boolean; isValid: boolean | null; to: { nodeId: string } | null }).to?.nodeId === id
    )
  })

  // Semantic zoom — derive tier from zoom so component only rerenders on tier change
  const zoomTier = useGraphStore((s) => {
    if (s.zoom < 0.6) return 'overview' as const
    if (s.zoom > 1.2) return 'detail' as const
    return 'normal' as const
  })

  const impact = impactMode && impactStatus ? IMPACT_STYLES[impactStatus] : null

  const borderColor = impact ? impact.border : docColor
  const bgColor = impact ? impact.bg : (selected ? '#eff6ff' : '#fff')
  const boxShadow = impact
    ? impact.ring
    : selected
      ? `0 0 0 3px ${docColor}44`
      : '0 1px 4px rgba(0,0,0,0.12)'

  return (
    <div
      style={{
        width: 256,
        height: 80,
        border: `2px solid ${borderColor}`,
        background: bgColor,
        boxShadow,
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
      }}
      className="rounded-lg px-2.5 py-2 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: docColor,
          width: 10,
          height: 10,
          // FR-9.6: Glow ring when this handle is being snapped onto
          boxShadow: isSnappedTarget
            ? `0 0 0 3px #6366f1, 0 0 0 6px rgba(99,102,241,0.25)`
            : undefined,
          transition: 'box-shadow 0.15s ease',
        }}
      />

      {/* Top row: dot + ID label + edge count badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Document color dot */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: docColor }}
        />
        {/* ID label */}
        <span style={{ color: docColor }} className="text-[11px] font-semibold truncate flex-1">
          {requirement.display_label}
        </span>
        {/* F17: Flag icon for changed nodes in impact mode */}
        {impactMode && impactStatus === 'changed' && (
          <span className="text-[10px] leading-none shrink-0" title="변경 예정">🚩</span>
        )}
        {/* APPROVED edge count badge — only at detail zoom */}
        {zoomTier === 'detail' && edgeCount > 0 && (
          <span className="text-[10px] text-slate-400 shrink-0">{edgeCount}↗</span>
        )}
      </div>

      {/* Title — hidden at overview zoom; 1-line at normal, 2-line at detail */}
      {zoomTier !== 'overview' && (
        <div className={[
          'text-slate-900 text-sm leading-snug',
          zoomTier === 'detail' ? 'line-clamp-2' : 'line-clamp-1',
        ].join(' ')}>
          {requirement.title}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: docColor, width: 10, height: 10 }}
      />
    </div>
  )
})

RequirementNode.displayName = 'RequirementNode'

export default RequirementNode
