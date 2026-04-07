import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge as FlowEdge,
  type Connection,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import type { components } from '../api/types.generated'
import RequirementNode, { type RequirementNodeData, type ImpactStatus } from './RequirementNode'
import CustomConnectionLine from './CustomConnectionLine'
import { DOC_COLORS } from '../utils/docColors'
import { useGraphStore } from '../stores/graphStore'

type Requirement = components['schemas']['Requirement']
type Edge = components['schemas']['Edge']
type ImpactResult = components['schemas']['ImpactResult']

const nodeTypes = { requirement: RequirementNode }

const NODE_WIDTH = 256
const NODE_HEIGHT = 80

function buildLayout(
  requirements: Requirement[],
  edges: Edge[],
  selectedNodeId: string | null,
  docColorMap: Record<string, string>,
  impactMode: boolean,
  affectedIds: Set<string>,
  reviewIds: Set<string>,
  hoveredEdgeId: string | null,
): { nodes: Node[]; edges: FlowEdge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 60 })

  for (const req of requirements) {
    g.setNode(req.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  const approvedEdges = edges.filter((e) => e.status === 'approved')
  for (const edge of approvedEdges) {
    g.setEdge(edge.source_id, edge.target_id)
  }

  dagre.layout(g)

  const nodes: Node[] = requirements.map((req) => {
    const pos = g.node(req.id)
    const docColor = docColorMap[req.location.document_id] ?? '#6366f1'

    let impactStatus: ImpactStatus = null
    if (impactMode) {
      if (req.changed) impactStatus = 'changed'
      else if (affectedIds.has(req.id)) impactStatus = 'affected'
      else if (reviewIds.has(req.id)) impactStatus = 'review'
    }

    const edgeCount = edges.filter(
      (e) => e.status === 'approved' && (e.source_id === req.id || e.target_id === req.id),
    ).length

    return {
      id: req.id,
      type: 'requirement',
      position: { x: pos ? pos.x - NODE_WIDTH / 2 : 0, y: pos ? pos.y - NODE_HEIGHT / 2 : 0 },
      data: {
        requirement: req,
        docColor,
        selected: req.id === selectedNodeId,
        impactMode,
        impactStatus,
        edgeCount,
      } satisfies RequirementNodeData,
    }
  })

  // Build impact node set for edge highlighting
  const impactNodeIds = new Set<string>()
  if (impactMode) {
    for (const req of requirements) {
      if (req.changed) impactNodeIds.add(req.id)
    }
    for (const id of affectedIds) impactNodeIds.add(id)
    for (const id of reviewIds) impactNodeIds.add(id)
  }

  const visibleEdges = edges.filter((e) => e.status === 'approved' || e.status === 'pending')
  const flowEdges: FlowEdge[] = visibleEdges.map((edge) => {
    const isRelatedTo = edge.relation_type === 'related_to'
    const isPending = edge.status === 'pending'
    const isImpactEdge = impactMode && (impactNodeIds.has(edge.source_id) || impactNodeIds.has(edge.target_id))

    // Impact mode edge colors: affected → red, review → yellow, changed → amber
    let strokeColor: string
    if (isImpactEdge) {
      const sourceAffected = affectedIds.has(edge.source_id) || affectedIds.has(edge.target_id)
      const sourceReview = reviewIds.has(edge.source_id) || reviewIds.has(edge.target_id)
      strokeColor = sourceAffected ? '#ef4444' : sourceReview ? '#eab308' : '#f59e0b'
    } else if (isPending) {
      strokeColor = '#f59e0b'
    } else {
      strokeColor = isRelatedTo ? '#8b5cf6' : '#3b82f6'
    }

    const isHovered = edge.id === hoveredEdgeId

    return {
      id: edge.id,
      source: edge.source_id,
      target: edge.target_id,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      markerStart: isRelatedTo ? { type: MarkerType.ArrowClosed } : undefined,
      style: {
        stroke: isHovered ? '#f97316' : strokeColor,
        strokeWidth: isHovered ? 4 : isImpactEdge ? 3 : 2,
        strokeDasharray: isPending ? '5,4' : undefined,
        opacity: impactMode && !isImpactEdge ? 0.25 : 1,
      },
      label: isRelatedTo ? 'related_to' : 'depends_on',
      labelStyle: { fontSize: 10, fill: '#64748b' },
      labelBgStyle: { fill: '#f8fafc' },
    }
  })

  return { nodes, edges: flowEdges }
}

interface RequirementGraphProps {
  requirements: Requirement[]
  edges: Edge[]
  selectedNodeId: string | null
  onNodeClick: (req: Requirement) => void
  onEdgeClick: (edgeId: string) => void
  onConnect: (sourceId: string, targetId: string) => void
  impactMode?: boolean
  impactResult?: ImpactResult | null
  hoveredEdgeId?: string | null
}

// Inner component — can use useReactFlow() because it's inside ReactFlowProvider
function GraphCanvas({
  requirements,
  edges,
  selectedNodeId,
  onNodeClick,
  onEdgeClick,
  onConnect,
  impactMode = false,
  impactResult = null,
  hoveredEdgeId = null,
}: RequirementGraphProps) {
  const { fitView } = useReactFlow()
  const { hiddenDocIds, showPending } = useGraphStore()

  const docColorMap = useMemo(() => {
    const ids = [...new Set(requirements.map((r) => r.location.document_id))]
    return Object.fromEntries(ids.map((id, i) => [id, DOC_COLORS[i % DOC_COLORS.length]]))
  }, [requirements])

  const affectedIds = useMemo(
    () => new Set(impactResult?.affected_items.map((i) => i.requirement_id) ?? []),
    [impactResult],
  )
  const reviewIds = useMemo(
    () => new Set(impactResult?.review_items.map((i) => i.requirement_id) ?? []),
    [impactResult],
  )

  const filteredRequirements = useMemo(
    () => requirements.filter((r) => !hiddenDocIds.includes(r.location.document_id)),
    [requirements, hiddenDocIds],
  )
  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredRequirements.map((r) => r.id))
    return edges.filter((e) => {
      if (!visibleNodeIds.has(e.source_id) || !visibleNodeIds.has(e.target_id)) return false
      if (e.status === 'pending' && !showPending) return false
      if (e.status === 'rejected') return false
      return true
    })
  }, [edges, filteredRequirements, showPending])

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildLayout(filteredRequirements, filteredEdges, selectedNodeId, docColorMap, impactMode, affectedIds, reviewIds, hoveredEdgeId),
    [filteredRequirements, filteredEdges, selectedNodeId, docColorMap, impactMode, affectedIds, reviewIds, hoveredEdgeId],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => { setNodes(initialNodes) }, [initialNodes, setNodes])
  useEffect(() => { setFlowEdges(initialEdges) }, [initialEdges, setFlowEdges])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const req = requirements.find((r) => r.id === node.id)
      if (req) {
        onNodeClick(req)
        // Only fitView in normal mode — in impact mode keep current viewport
        if (!impactMode) {
          void fitView({
            nodes: [{ id: node.id }],
            duration: 800,
            padding: 0.5,
          })
        }
      }
    },
    [requirements, onNodeClick, fitView, impactMode],
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: FlowEdge) => {
      onEdgeClick(edge.id)
    },
    [onEdgeClick],
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onConnect(connection.source, connection.target)
      }
    },
    [onConnect],
  )

  // MiniMap node click — smooth pan to clicked node
  const handleMiniMapNodeClick: NodeMouseHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      void fitView({
        nodes: [{ id: node.id }],
        duration: 800,
        padding: 0.5,
      })
    },
    [fitView],
  )

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onConnect={handleConnect}
        // Disable edge creation in impact mode
        nodesConnectable={!impactMode}
        connectionRadius={40}
        connectionLineComponent={CustomConnectionLine}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap onNodeClick={handleMiniMapNodeClick} />
      </ReactFlow>
    </div>
  )
}

export default function RequirementGraph(props: RequirementGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  )
}
