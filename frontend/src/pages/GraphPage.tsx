import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listEdges, updateEdge, createEdge, deleteEdge } from '../api/edges'
import { listDocuments } from '../api/documents'
import { useGraphStore } from '../stores/graphStore'
import RequirementGraph from '../components/RequirementGraph'
import NodeDetailPanel from '../components/NodeDetailPanel'
import EdgeReviewPanel from '../components/EdgeReviewPanel'
import AddEdgeModal from '../components/AddEdgeModal'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type RelationType = components['schemas']['RelationType']

export default function GraphPage() {
  const navigate = useNavigate()
  const { requirements, edges, setEdges } = useGraphStore()

  const [documents, setDocuments] = useState<Record<string, string>>({})
  const [selectedNode, setSelectedNode] = useState<Requirement | null>(null)
  const [selectedForAdd, setSelectedForAdd] = useState<Requirement[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [activePanel, setActivePanel] = useState<'detail' | 'review'>('review')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load edges and documents
    void (async () => {
      try {
        setLoading(true)
        const [edgeRes, docRes] = await Promise.all([listEdges(), listDocuments()])
        setEdges(edgeRes.edges)
        const docMap: Record<string, string> = {}
        for (const doc of docRes.documents) docMap[doc.id] = doc.filename
        setDocuments(docMap)
      } catch (err) {
        setError(err instanceof Error ? err.message : '로드 실패')
      } finally {
        setLoading(false)
      }
    })()
  }, [setEdges])

  const pendingEdges = useMemo(() => edges.filter((e) => e.status === 'pending'), [edges])

  const handleNodeClick = useCallback(
    (req: Requirement) => {
      setSelectedNode(req)
      setActivePanel('detail')

      setSelectedForAdd((prev) => {
        if (prev.find((r) => r.id === req.id)) return prev
        const next = [...prev, req].slice(-2)
        return next
      })
    },
    [],
  )

  const handleEdgeClick = useCallback((edgeId: string) => {
    void (async () => {
      if (!confirm('이 Edge를 삭제하시겠습니까?')) return
      try {
        await deleteEdge(edgeId)
        const res = await listEdges()
        setEdges(res.edges)
      } catch (err) {
        setError(err instanceof Error ? err.message : '삭제 실패')
      }
    })()
  }, [setEdges])

  const handleApprove = useCallback(
    async (edgeId: string) => {
      await updateEdge(edgeId, { status: 'approved' })
      const res = await listEdges()
      setEdges(res.edges)
    },
    [setEdges],
  )

  const handleReject = useCallback(
    async (edgeId: string) => {
      await updateEdge(edgeId, { status: 'rejected' })
      const res = await listEdges()
      setEdges(res.edges)
    },
    [setEdges],
  )

  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      if (!confirm('이 Edge를 삭제하시겠습니까?')) return
      await deleteEdge(edgeId)
      const res = await listEdges()
      setEdges(res.edges)
    },
    [setEdges],
  )

  const handleAddEdge = useCallback(
    async (sourceId: string, targetId: string, relationType: RelationType, evidence: string) => {
      await createEdge({ source_id: sourceId, target_id: targetId, relation_type: relationType, evidence })
      const res = await listEdges()
      setEdges(res.edges)
    },
    [setEdges],
  )

  if (requirements.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, color: '#64748b' }}>
        <div style={{ fontSize: 48 }}>🕸️</div>
        <div style={{ fontSize: 16 }}>요구사항이 없습니다. 먼저 파싱을 완료하세요.</div>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '8px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          업로드 페이지로
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 20px',
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', flex: 1 }}>
          의존관계 그래프
        </div>

        {selectedForAdd.length === 2 && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '7px 16px',
              borderRadius: 7,
              border: '1px solid #3b82f6',
              background: '#eff6ff',
              color: '#1d4ed8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            연결 추가 ({selectedForAdd.map((r) => r.display_label).join(' → ')})
          </button>
        )}

        {selectedForAdd.length > 0 && (
          <button
            onClick={() => setSelectedForAdd([])}
            style={{
              padding: '7px 12px',
              borderRadius: 7,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            선택 해제
          </button>
        )}

        <button
          onClick={() => navigate('/impact')}
          style={{
            padding: '7px 16px',
            borderRadius: 7,
            border: 'none',
            background: '#7c3aed',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          영향 분석으로 →
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px 20px', background: '#fef2f2', color: '#b91c1c', fontSize: 13, borderBottom: '1px solid #fecaca' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>×</button>
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Graph area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '4px 14px', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 12, color: '#64748b', zIndex: 10 }}>
              로딩 중...
            </div>
          )}
          <RequirementGraph
            requirements={requirements}
            edges={edges}
            selectedNodeId={selectedNode?.id ?? null}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />
        </div>

        {/* Side panel */}
        <div
          style={{
            width: 320,
            borderLeft: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            background: '#f8fafc',
            overflow: 'hidden',
          }}
        >
          {/* Panel tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
            <button
              onClick={() => setActivePanel('review')}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activePanel === 'review' ? 700 : 400,
                color: activePanel === 'review' ? '#3b82f6' : '#64748b',
                borderBottom: activePanel === 'review' ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              Edge 검토 {pendingEdges.length > 0 ? `(${pendingEdges.length})` : ''}
            </button>
            <button
              onClick={() => setActivePanel('detail')}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activePanel === 'detail' ? 700 : 400,
                color: activePanel === 'detail' ? '#3b82f6' : '#64748b',
                borderBottom: activePanel === 'detail' ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              노드 상세
            </button>
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'hidden', padding: 12 }}>
            {activePanel === 'review' ? (
              <EdgeReviewPanel
                pendingEdges={pendingEdges}
                requirements={requirements}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ) : (
              <NodeDetailPanel
                requirement={selectedNode}
                requirements={requirements}
                edges={edges}
                documents={documents}
                onClose={() => { setSelectedNode(null); setActivePanel('review') }}
                onDeleteEdge={handleDeleteEdge}
              />
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddEdgeModal
          selectedNodes={selectedForAdd}
          onAdd={handleAddEdge}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
