import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']

export interface RequirementNodeData {
  requirement: Requirement
  docColor: string
  selected: boolean
}

const RequirementNode = memo(({ data }: NodeProps) => {
  const { requirement, docColor, selected } = data as unknown as RequirementNodeData
  return (
    <div
      style={{
        border: `2px solid ${docColor}`,
        borderRadius: 8,
        background: selected ? '#eff6ff' : '#fff',
        padding: '8px 12px',
        minWidth: 160,
        maxWidth: 220,
        boxShadow: selected ? `0 0 0 3px ${docColor}44` : '0 1px 4px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: docColor }} />
      <div style={{ fontWeight: 600, color: docColor, marginBottom: 2, fontSize: 10 }}>
        {requirement.display_label}
      </div>
      <div
        style={{
          color: '#1e293b',
          lineHeight: 1.4,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {requirement.title}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: docColor }} />
    </div>
  )
})

RequirementNode.displayName = 'RequirementNode'

export default RequirementNode
