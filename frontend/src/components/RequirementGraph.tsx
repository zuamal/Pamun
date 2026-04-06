import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge as FlowEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import type { components } from '../api/types.generated'
import RequirementNode, { type RequirementNodeData } from './RequirementNode'
import { DOC_COLORS } from '../utils/docColors'

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

  const flowEdges: FlowEdge[] = approvedEdges.map((edge) => {
    const isRelatedTo = edge.relation_type === 'related_to'
    return {
      id: edge.id,
      source: edge.source_id,
      target: edge.target_id,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      markerStart: isRelatedTo ? { type: MarkerType.ArrowClosed } : undefined,
      style: { stroke: isRelatedTo ? '#8b5cf6' : '#3b82f6', strokeWidth: 2 },
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
}

export default function RequirementGraph({
  requirements,
  edges,
  selectedNodeId,
  onNodeClick,
  onEdgeClick,
}: RequirementGraphProps) {
  const docColorMap = useMemo(() => {
    const ids = [...new Set(requirements.map((r) => r.location.document_id))]
    return Object.fromEntries(ids.map((id, i) => [id, DOC_COLORS[i % DOC_COLORS.length]]))
  }, [requirements])

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildLayout(requirements, edges, selectedNodeId, docColorMap),
    [requirements, edges, selectedNodeId, docColorMap],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => { setNodes(initialNodes) }, [initialNodes, setNodes])
  useEffect(() => { setFlowEdges(initialEdges) }, [initialEdges, setFlowEdges])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const req = requirements.find((r) => r.id === node.id)
      if (req) onNodeClick(req)
    },
    [requirements, onNodeClick],
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: FlowEdge) => {
      onEdgeClick(edge.id)
    },
    [onEdgeClick],
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
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
