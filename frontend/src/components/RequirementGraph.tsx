import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from 'react-force-graph-2d'
import { buildGraphData, type GraphNode, type GraphLink } from '../lib/graphAdapter'
import { useGraphStore } from '../stores/graphStore'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type Edge = components['schemas']['Edge']
type ImpactResult = components['schemas']['ImpactResult']

// ─── Canvas helpers ──────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + '…'
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
  size: number, color: string,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX)
  // Place arrowhead slightly before endpoint
  const ax = toX - size * 0.5 * Math.cos(angle)
  const ay = toY - size * 0.5 * Math.sin(angle)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(ax - size * Math.cos(angle - Math.PI / 6), ay - size * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(ax - size * Math.cos(angle + Math.PI / 6), ay - size * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

const NODE_W = 120
const NODE_H = 40
const NODE_R = 6
const PAD = 8

interface DrawNodeOpts {
  selected: boolean
  hovered: boolean
  isPendingSource: boolean
  dimmed: boolean
  impactMode: boolean
}

function drawNode(
  node: GraphNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  opts: DrawNodeOpts,
) {
  const { x = 0, y = 0, color, label, title, approvedCount, status } = node
  const { selected, hovered, isPendingSource, dimmed, impactMode } = opts

  ctx.save()
  ctx.globalAlpha = dimmed ? 0.08 : 1.0

  if (globalScale <= 0.3) {
    // Dot only
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
    return
  }

  const x0 = x - NODE_W / 2
  const y0 = y - NODE_H / 2

  // ─── Background ───
  let bgColor = '#1e293b'
  if (impactMode && status) {
    bgColor = status === 'changed' ? '#451a03' : status === 'affected' ? '#450a0a' : '#422006'
  } else if (selected) {
    bgColor = '#1e3a5f'
  }
  roundRect(ctx, x0, y0, NODE_W, NODE_H, NODE_R)
  ctx.fillStyle = bgColor
  ctx.fill()

  // ─── Border + glow ───
  let borderColor = color
  let lineWidth = 1.5 / globalScale
  if (impactMode) {
    if (status === 'changed') borderColor = '#f59e0b'
    else if (status === 'affected') borderColor = '#ef4444'
    else if (status === 'review_recommended') borderColor = '#eab308'
  }
  if (hovered) {
    lineWidth = 2.5 / globalScale
    ctx.shadowBlur = 20 / globalScale
    ctx.shadowColor = 'rgba(255,255,255,0.6)'
  } else if (isPendingSource || selected) {
    lineWidth = 2.5 / globalScale
    ctx.shadowBlur = 10 / globalScale
    ctx.shadowColor = isPendingSource ? '#ffffff' : '#93c5fd'
  }
  if (impactMode && status === 'changed') {
    ctx.shadowBlur = 14 / globalScale
    ctx.shadowColor = '#f59e0b'
  }

  ctx.strokeStyle = (hovered || isPendingSource) ? '#ffffff' : borderColor
  ctx.lineWidth = lineWidth
  roundRect(ctx, x0, y0, NODE_W, NODE_H, NODE_R)
  ctx.stroke()
  ctx.shadowBlur = 0

  // ─── Top row: dot + label ───
  const dotR = 2.5
  const dotX = x0 + PAD + dotR
  const topY = y0 + NODE_H * 0.33

  ctx.beginPath()
  ctx.arc(dotX, topY, dotR, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()

  ctx.font = `600 ${10}px system-ui,sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  const labelMaxW = NODE_W - PAD * 2 - dotR * 2 - 4 - (globalScale > 1.2 && approvedCount > 0 ? 24 : 0)
  ctx.fillText(truncateText(ctx, label, labelMaxW), dotX + dotR + 4, topY)

  // Edge count badge (detail zoom only)
  if (globalScale > 1.2 && approvedCount > 0) {
    ctx.font = `${9}px system-ui,sans-serif`
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'right'
    ctx.fillText(`${approvedCount}↗`, x0 + NODE_W - PAD, topY)
  }

  // Flag for changed
  if (impactMode && status === 'changed') {
    ctx.font = `${10}px system-ui,sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText('🚩', x0 + NODE_W - PAD, topY)
  }

  // ─── Title (0.9+ zoom) ───
  if (globalScale >= 0.9) {
    ctx.font = `${11}px system-ui,sans-serif`
    ctx.fillStyle = '#e2e8f0'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const titleY = y0 + NODE_H * 0.72
    ctx.fillText(truncateText(ctx, title, NODE_W - PAD * 2), x0 + PAD, titleY)
  }

  ctx.restore()
}

interface DrawLinkOpts {
  hovered: boolean
  dimmed: boolean
  impactMode: boolean
  affectedIds: Set<string>
  reviewIds: Set<string>
}

function drawLink(
  link: GraphLink,
  src: GraphNode,
  tgt: GraphNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  opts: DrawLinkOpts,
) {
  const { hovered, dimmed, impactMode, affectedIds, reviewIds } = opts
  const isPending = link.status === 'pending'
  const isRelatedTo = link.relationType === 'related_to'

  ctx.save()
  ctx.globalAlpha = dimmed ? 0.04 : 1.0

  const baseWidth = impactMode ? 3 : 2
  const strokeWidth = globalScale < 0.9 ? Math.max(2, baseWidth / globalScale) : baseWidth

  // Color
  let strokeColor: string
  if (hovered) {
    strokeColor = '#f97316'
  } else if (impactMode) {
    const srcId = src.id
    const tgtId = tgt.id
    const aff = affectedIds.has(srcId) || affectedIds.has(tgtId)
    const rev = reviewIds.has(srcId) || reviewIds.has(tgtId)
    strokeColor = aff ? 'rgba(239,68,68,0.9)' : rev ? 'rgba(234,179,8,0.9)' : 'rgba(245,158,11,0.9)'
  } else if (isPending) {
    strokeColor = 'rgba(148,163,184,0.45)'
  } else {
    strokeColor = isRelatedTo ? 'rgba(139,92,246,0.8)' : 'rgba(59,130,246,0.8)'
  }

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = (hovered ? strokeWidth * 1.8 : strokeWidth) / globalScale

  if (isPending || isRelatedTo) {
    ctx.setLineDash([5 / globalScale, 4 / globalScale])
  } else {
    ctx.setLineDash([])
  }

  ctx.beginPath()
  ctx.moveTo(src.x!, src.y!)
  ctx.lineTo(tgt.x!, tgt.y!)
  ctx.stroke()
  ctx.setLineDash([])

  // Arrows
  const arrowSize = 8 / globalScale
  drawArrow(ctx, src.x!, src.y!, tgt.x!, tgt.y!, arrowSize, strokeColor)
  if (isRelatedTo) {
    drawArrow(ctx, tgt.x!, tgt.y!, src.x!, src.y!, arrowSize, strokeColor)
  }

  ctx.restore()
}

function isNeighbor(nodeId: string, hoveredId: string, links: GraphLink[]): boolean {
  return links.some((l) => {
    const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
    const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
    return (s === hoveredId && t === nodeId) || (t === hoveredId && s === nodeId)
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

interface RequirementGraphProps {
  requirements: Requirement[]
  edges: Edge[]
  selectedNodeId: string | null
  onNodeClick: (req: Requirement) => void
  onEdgeClick: (edgeId: string) => void
  onConnect: (sourceId: string, targetId: string) => void
  connectMode?: boolean
  impactMode?: boolean
  impactResult?: ImpactResult | null
  hoveredEdgeId?: string | null
}

export default function RequirementGraph({
  requirements,
  edges,
  selectedNodeId,
  onNodeClick,
  onEdgeClick,
  onConnect,
  connectMode = false,
  impactMode = false,
  impactResult = null,
  hoveredEdgeId = null,
}: RequirementGraphProps) {
  const fgRef = useRef<ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const {
    hiddenDocIds,
    showPending,
    pendingSource,
    setPendingSource,
    pinnedNodes,
    setPinnedNode,
  } = useGraphStore()

  // Container size observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Mouse position for tooltip
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    el.addEventListener('mousemove', handler)
    return () => el.removeEventListener('mousemove', handler)
  }, [])

  // ESC cancels pending source
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingSource(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setPendingSource])

  // Derived sets
  const affectedIds = useMemo(
    () => new Set(impactResult?.affected_items.map((i) => i.requirement_id) ?? []),
    [impactResult],
  )
  const reviewIds = useMemo(
    () => new Set(impactResult?.review_items.map((i) => i.requirement_id) ?? []),
    [impactResult],
  )

  // Graph data
  const graphData = useMemo(() => {
    const visibleReqs = requirements.filter(
      (r) => !hiddenDocIds.includes(r.location.document_id),
    )
    const visibleIds = new Set(visibleReqs.map((r) => r.id))
    const visibleEdges = edges.filter((e) => {
      if (!visibleIds.has(e.source_id) || !visibleIds.has(e.target_id)) return false
      if (e.status === 'rejected') return false
      if (e.status === 'pending' && !showPending) return false
      return true
    })
    return buildGraphData(visibleReqs, visibleEdges, affectedIds, reviewIds, pinnedNodes)
  }, [requirements, edges, hiddenDocIds, showPending, affectedIds, reviewIds, pinnedNodes])

  // Configure d3 forces after graph loads
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    const charge = fg.d3Force('charge') as unknown as { strength: (s: number) => void } | undefined
    if (charge?.strength) charge.strength(-300)
    const link = fg.d3Force('link') as unknown as { distance: (fn: (l: unknown) => number) => void } | undefined
    if (link?.distance) {
      link.distance((l: unknown) => ((l as GraphLink).relationType === 'depends_on' ? 120 : 80))
    }
  }, [graphData])

  // Stable opts ref (avoids recreating canvas callbacks every frame)
  const optsRef = useRef({
    selectedNodeId,
    hoveredNodeId,
    pendingSource,
    hoveredEdgeId,
    hoveredLinkId: null as string | null,
    connectMode,
    impactMode,
    affectedIds,
    reviewIds,
    graphLinks: graphData.links,
  })
  useEffect(() => {
    optsRef.current = {
      selectedNodeId,
      hoveredNodeId,
      pendingSource,
      hoveredEdgeId,
      hoveredLinkId: hoveredLink?.id ?? null,
      connectMode,
      impactMode,
      affectedIds,
      reviewIds,
      graphLinks: graphData.links,
    }
  })

  const nodeCanvasObject = useCallback((node: NodeObject<GraphNode>, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode
    const { selectedNodeId: sel, hoveredNodeId: hov, pendingSource: ps, impactMode: im, graphLinks } = optsRef.current
    const dimmed = hov !== null && n.id !== hov && !isNeighbor(n.id, hov, graphLinks)
    drawNode(n, ctx, globalScale, {
      selected: n.id === sel,
      hovered: n.id === hov,
      isPendingSource: n.id === ps,
      dimmed,
      impactMode: im,
    })
  }, [])

  const nodePointerAreaPaint = useCallback((node: NodeObject<GraphNode>, color: string, ctx: CanvasRenderingContext2D) => {
    const n = node as GraphNode
    ctx.fillStyle = color
    ctx.fillRect((n.x ?? 0) - NODE_W / 2, (n.y ?? 0) - NODE_H / 2, NODE_W, NODE_H)
  }, [])

  const linkCanvasObject = useCallback((link: LinkObject<GraphNode, GraphLink>, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const l = link as GraphLink
    const src = l.source as GraphNode
    const tgt = l.target as GraphNode
    const { hoveredEdgeId: hei, hoveredLinkId: hli, hoveredNodeId: hov, impactMode: im, affectedIds: ai, reviewIds: ri } = optsRef.current
    const srcId = src.id
    const tgtId = tgt.id
    const dimmed = hov !== null && srcId !== hov && tgtId !== hov
    drawLink(l, src, tgt, ctx, globalScale, {
      hovered: l.id === hei || l.id === hli,
      dimmed,
      impactMode: im,
      affectedIds: ai,
      reviewIds: ri,
    })
  }, [])

  // Particle config
  const particleCount = useCallback((link: LinkObject<GraphNode, GraphLink>) => {
    if (!impactMode) return 0
    const l = link as GraphLink
    const src = (l.source as GraphNode).id
    const tgt = (l.target as GraphNode).id
    if (affectedIds.has(tgt) || affectedIds.has(src) || reviewIds.has(tgt) || reviewIds.has(src)) return 3
    return 0
  }, [impactMode, affectedIds, reviewIds])

  const particleColor = useCallback((link: LinkObject<GraphNode, GraphLink>) => {
    const tgt = ((link as GraphLink).target as GraphNode).id
    return affectedIds.has(tgt) ? '#ef4444' : '#f59e0b'
  }, [affectedIds])

  // Event handlers
  const handleNodeClick = useCallback((node: NodeObject<GraphNode>) => {
    const n = node as GraphNode
    if (impactMode) return
    const { pendingSource: ps, connectMode: cm } = optsRef.current
    if (ps) {
      // Second click: complete connection or cancel if same node
      if (ps !== n.id) {
        onConnect(ps, n.id)
      }
      setPendingSource(null)
    } else if (cm) {
      // Connect mode active, no source yet: select this node as source
      setPendingSource(n.id)
    } else {
      const req = requirements.find((r) => r.id === n.id)
      if (req) onNodeClick(req)
    }
  }, [impactMode, requirements, onNodeClick, onConnect, setPendingSource])

  const handleNodeHover = useCallback((node: NodeObject<GraphNode> | null) => {
    setHoveredNodeId(node ? (node as GraphNode).id : null)
  }, [])

  const handleLinkClick = useCallback((link: LinkObject<GraphNode, GraphLink>) => {
    onEdgeClick((link as GraphLink).id)
  }, [onEdgeClick])

  const handleLinkHover = useCallback((link: LinkObject<GraphNode, GraphLink> | null) => {
    setHoveredLink(link ? (link as GraphLink) : null)
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setPendingSource(null)
  }, [setPendingSource])

  const handleNodeDragEnd = useCallback((node: NodeObject<GraphNode>) => {
    const n = node as GraphNode
    if (n.x !== undefined && n.y !== undefined) {
      setPinnedNode(n.id, { x: n.x, y: n.y })
    }
  }, [setPinnedNode])

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ background: '#0f1117' }}>
      {size.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData as { nodes: NodeObject<GraphNode>[]; links: LinkObject<GraphNode, GraphLink>[] }}
          width={size.width}
          height={size.height}
          backgroundColor="#0f1117"
          nodeId="id"
          nodeLabel=""
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode="replace"
          nodePointerAreaPaint={nodePointerAreaPaint}
          linkCanvasObject={linkCanvasObject}
          linkCanvasObjectMode="replace"
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onLinkClick={handleLinkClick}
          onLinkHover={handleLinkHover}
          onBackgroundClick={handleBackgroundClick}
          onNodeDragEnd={handleNodeDragEnd}
          linkDirectionalParticles={impactMode ? particleCount : 0}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleColor={particleColor}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      )}

      {/* Pending source banner */}
      {pendingSource && !impactMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none select-none">
          소스 선택됨 — 대상 노드를 클릭하세요&nbsp;&nbsp;(ESC: 취소)
        </div>
      )}

      {/* Edge hover tooltip */}
      {hoveredLink && mousePos && (
        <div
          className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 max-w-[240px] shadow-lg pointer-events-none select-none border border-slate-700"
          style={{ position: 'fixed', left: mousePos.x + 14, top: mousePos.y - 12, zIndex: 50 }}
        >
          <div className="font-semibold mb-0.5">{hoveredLink.relationType}</div>
          {hoveredLink.evidence && (
            <div className="opacity-80 leading-snug line-clamp-3">{hoveredLink.evidence}</div>
          )}
          <div className="opacity-60 mt-1">confidence: {hoveredLink.confidence?.toFixed(1) ?? '—'}</div>
        </div>
      )}
    </div>
  )
}
