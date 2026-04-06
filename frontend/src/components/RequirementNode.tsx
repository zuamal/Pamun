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
        background: selected ? '#eff6ff' : '#fff',
        boxShadow: selected ? `0 0 0 3px ${docColor}44` : '0 1px 4px rgba(0,0,0,0.12)',
      }}
      className="rounded-lg p-2 min-w-[160px] max-w-[220px] cursor-pointer text-xs"
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: docColor, width: 10, height: 10 }}
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
