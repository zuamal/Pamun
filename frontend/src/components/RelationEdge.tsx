import { useState, useCallback } from 'react'
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
} from '@xyflow/react'
import { useGraphStore } from '../stores/graphStore'

export interface RelationEdgeData {
  relationType: 'depends_on' | 'related_to'
  evidence: string
  confidence: number
}

export default function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  markerStart,
  data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const { relationType, evidence, confidence } = (data ?? {}) as unknown as RelationEdgeData

  const zoom = useGraphStore((s) => s.zoom)
  const isOverview = zoom < 0.6

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  // Simplify edges at low zoom
  const resolvedStyle: React.CSSProperties = isOverview
    ? { ...style, strokeWidth: 1, strokeDasharray: undefined }
    : style ?? {}

  const onEnter = useCallback(() => setHovered(true), [])
  const onLeave = useCallback(() => setHovered(false), [])

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={resolvedStyle}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={20}
      />
      {/* Wider transparent path for reliable hover detection */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={20}
        fill="none"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{ cursor: 'default' }}
      />
      {hovered && !isOverview && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, calc(-100% - 8px)) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              zIndex: 50,
            }}
            className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 max-w-[240px] shadow-lg"
          >
            <div className="font-semibold mb-0.5">
              {relationType === 'depends_on' ? 'depends_on' : 'related_to'}
            </div>
            {evidence && (
              <div className="opacity-80 leading-snug line-clamp-3">{evidence}</div>
            )}
            <div className="opacity-60 mt-1">confidence: {confidence?.toFixed(1) ?? '—'}</div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
