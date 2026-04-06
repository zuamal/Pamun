import type { ConnectionLineComponentProps } from '@xyflow/react'

/**
 * FR-9.6: Custom connection line with magnetic snap feedback.
 *
 * When the drag handle enters the connectionRadius (40px) of a valid target handle,
 * React Flow sets connectionStatus to 'valid'. We use this to:
 * - Switch the line color from grey → indigo
 * - Thicken the stroke for "locked-on" feedback
 * - Show a glow circle at the snap point
 */
export default function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const isSnapped = connectionStatus === 'valid'
  const strokeColor = isSnapped ? '#6366f1' : '#94a3b8'
  const strokeWidth = isSnapped ? 2.5 : 1.5

  // Simple cubic bezier matching smoothstep style
  const dx = Math.abs(toX - fromX)
  const curvature = Math.min(dx * 0.5, 80)
  const d = `M${fromX},${fromY} C${fromX + curvature},${fromY} ${toX - curvature},${toY} ${toX},${toY}`

  return (
    <g>
      {/* Drop shadow for depth when snapped */}
      {isSnapped && (
        <path
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 4}
          opacity={0.15}
          d={d}
        />
      )}

      <path
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isSnapped ? undefined : '5,4'}
        d={d}
      />

      {/* Snap target glow ring */}
      {isSnapped && (
        <>
          <circle cx={toX} cy={toY} r={10} fill={strokeColor} opacity={0.15} />
          <circle cx={toX} cy={toY} r={5} fill={strokeColor} opacity={0.6} />
        </>
      )}
    </g>
  )
}
