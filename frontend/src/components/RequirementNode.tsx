import { memo } from 'react'
import { Handle, Position, useStore } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']

export type ImpactStatus = 'changed' | 'affected' | 'review' | null

export interface RequirementNodeData {
  requirement: Requirement
  docColor: string
  selected: boolean
  impactMode: boolean
  impactStatus: ImpactStatus
}

// Impact mode visual config
const IMPACT_STYLES: Record<NonNullable<ImpactStatus>, { border: string; bg: string; ring: string }> = {
  changed: { border: '#f59e0b', bg: '#fff7ed', ring: '0 0 0 2px #f59e0b, 0 1px 4px rgba(0,0,0,0.12)' },
  affected: { border: '#ef4444', bg: '#fef2f2', ring: '0 0 0 2px #ef4444, 0 1px 4px rgba(0,0,0,0.12)' },
  review:   { border: '#eab308', bg: '#fefce8', ring: '0 0 0 2px #eab308, 0 1px 4px rgba(0,0,0,0.12)' },
}

const RequirementNode = memo(({ data, id }: NodeProps) => {
  const { requirement, docColor, selected, impactMode, impactStatus } = data as unknown as RequirementNodeData

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
        border: `2px solid ${borderColor}`,
        background: bgColor,
        boxShadow,
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
      }}
      className="rounded-lg p-2 min-w-[160px] max-w-[220px] cursor-pointer text-xs"
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

      <div className="flex items-start justify-between gap-1 mb-0.5">
        <div style={{ color: docColor }} className="font-bold text-[10px]">
          {requirement.display_label}
        </div>
        {/* F17: Flag icon for changed nodes in impact mode */}
        {impactMode && impactStatus === 'changed' && (
          <span className="text-[10px] leading-none shrink-0" title="변경 예정">🚩</span>
        )}
      </div>

      <div className="text-slate-900 leading-snug line-clamp-3">
        {requirement.title}
      </div>

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
