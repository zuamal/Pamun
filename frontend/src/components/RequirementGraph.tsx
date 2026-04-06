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
import RequirementNode, { type RequirementNodeData } from './RequirementNode'
import CustomConnectionLine from './CustomConnectionLine'
import { DOC_COLORS } from '../utils/docColors'
import { useGraphStore } from '../stores/graphStore'

type Requirement = components['schemas']['Requirement']
type Edge = components['schemas']['Edge']

const nodeTypes = { requirement: RequirementNode }

const NODE_WIDTH = 220
const NODE_HEIGHT = 90

function buildLayout(
  requirements: Requirement[],
  edges: Edge[],
  selectedNodeId: string | null,
  docColorMap: Record<string, string>,
): { nodes: Node[]; edges: FlowEdge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 })

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
    return {
      id: req.id,
      type: 'requirement',
      position: { x: pos ? pos.x - NODE_WIDTH / 2 : 0, y: pos ? pos.y - NODE_HEIGHT / 2 : 0 },
      data: {
        requirement: req,
        docColor,
        selected: req.id === selectedNodeId,
      } satisfies RequirementNodeData,
    }
  })

  const visibleEdges = edges.filter((e) => e.status === 'approved' || e.status === 'pending')
  const flowEdges: FlowEdge[] = visibleEdges.map((edge) => {
    const isRelatedTo = edge.relation_type === 'related_to'
    const isPending = edge.status === 'pending'
    return {
      id: edge.id,
      source: edge.source_id,
      target: edge.target_id,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      markerStart: isRelatedTo ? { type: MarkerType.ArrowClosed } : undefined,
      style: {
        stroke: isPending ? '#f59e0b' : (isRelatedTo ? '#8b5cf6' : '#3b82f6'),
        strokeWidth: 2,
        strokeDasharray: isPending ? '5,4' : undefined,
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
}

// Inner component — can use useReactFlow() because it's inside ReactFlowProvider
function GraphCanvas({
  requirements,
  edges,
  selectedNodeId,
  onNodeClick,
  onEdgeClick,
  onConnect,
}: RequirementGraphProps) {
  const { fitView } = useReactFlow()
  const { hiddenDocIds, showPending } = useGraphStore()

  const docColorMap = useMemo(() => {
    const ids = [...new Set(requirements.map((r) => r.location.document_id))]
    return Object.fromEntries(ids.map((id, i) => [id, DOC_COLORS[i % DOC_COLORS.length]]))
  }, [requirements])

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
    () => buildLayout(filteredRequirements, filteredEdges, selectedNodeId, docColorMap),
    [filteredRequirements, filteredEdges, selectedNodeId, docColorMap],
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
        void fitView({
          nodes: [{ id: node.id }],
          duration: 800,
          padding: 0.5,
        })
      }
    },
    [requirements, onNodeClick, fitView],
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
