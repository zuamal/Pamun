import { memo } from 'react'
import { Handle, Position, useStore } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']

export interface RequirementNodeData {
  requirement: Requirement
  docColor: string
  selected: boolean
}

const RequirementNode = memo(({ data, id }: NodeProps) => {
  const { requirement, docColor, selected } = data as unknown as RequirementNodeData

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

  return (
    <div
      style={{
        border: `2px solid ${docColor}`,
        background: selected ? '#eff6ff' : '#fff',
        boxShadow: selected ? `0 0 0 3px ${docColor}44` : '0 1px 4px rgba(0,0,0,0.12)',
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
      <div style={{ color: docColor }} className="font-bold mb-0.5 text-[10px]">
        {requirement.display_label}
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
