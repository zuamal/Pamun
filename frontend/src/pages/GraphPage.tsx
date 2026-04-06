import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listEdges, updateEdge, createEdge, deleteEdge } from '../api/edges'
import { listDocuments } from '../api/documents'
import { useGraphStore } from '../stores/graphStore'
import RequirementGraph from '../components/RequirementGraph'
import NodeDetailPanel from '../components/NodeDetailPanel'
import EdgeReviewPanel from '../components/EdgeReviewPanel'
import AddEdgeModal from '../components/AddEdgeModal'
import { toastError } from '../lib/toast'
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

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        const [edgeRes, docRes] = await Promise.all([listEdges(), listDocuments()])
        setEdges(edgeRes.edges)
        const docMap: Record<string, string> = {}
        for (const doc of docRes.documents) docMap[doc.id] = doc.filename
        setDocuments(docMap)
      } catch (err) {
        toastError(err instanceof Error ? err.message : '로드 실패')
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
        return [...prev, req].slice(-2)
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
        toastError(err instanceof Error ? err.message : '삭제 실패')
      }
    })()
  }, [setEdges])

  const handleApprove = useCallback(async (edgeId: string) => {
    try {
      await updateEdge(edgeId, { status: 'approved' })
      const res = await listEdges()
      setEdges(res.edges)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '승인 실패')
    }
  }, [setEdges])

  const handleReject = useCallback(async (edgeId: string) => {
    try {
      await updateEdge(edgeId, { status: 'rejected' })
      const res = await listEdges()
      setEdges(res.edges)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '거부 실패')
    }
  }, [setEdges])

  const handleDeleteEdge = useCallback(async (edgeId: string) => {
    if (!confirm('이 Edge를 삭제하시겠습니까?')) return
    try {
      await deleteEdge(edgeId)
      const res = await listEdges()
      setEdges(res.edges)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패')
    }
  }, [setEdges])

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
      <div className="flex items-center justify-center h-full flex-col gap-4 text-slate-500">
        <div className="text-5xl">🕸️</div>
        <div className="text-base">요구사항이 없습니다. 먼저 파싱을 완료하세요.</div>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2 rounded-lg bg-blue-500 text-white border-none cursor-pointer"
        >
          업로드 페이지로
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center px-5 py-2.5 bg-white border-b border-slate-200 gap-3 shrink-0">
        <div className="font-bold text-base text-slate-900 flex-1">의존관계 그래프</div>

        {selectedForAdd.length === 2 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-1.5 rounded-lg border border-blue-400 bg-blue-50 text-blue-700 cursor-pointer text-[13px] font-semibold"
          >
            연결 추가 ({selectedForAdd.map((r) => r.display_label).join(' → ')})
          </button>
        )}

        {selectedForAdd.length > 0 && (
          <button
            onClick={() => setSelectedForAdd([])}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-pointer text-xs"
          >
            선택 해제
          </button>
        )}

        <button
          onClick={() => navigate('/impact')}
          className="px-4 py-1.5 rounded-lg border-none bg-violet-700 text-white cursor-pointer text-[13px] font-semibold"
        >
          영향 분석으로 →
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph area */}
        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white px-3.5 py-1 rounded-full shadow text-xs text-slate-500 z-10">
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
        <div className="w-80 border-l border-slate-200 flex flex-col bg-slate-50 overflow-hidden">
          {/* Panel tabs */}
          <div className="flex border-b border-slate-200 bg-white shrink-0">
            <button
              onClick={() => setActivePanel('review')}
              className={[
                'flex-1 py-2.5 border-none bg-transparent cursor-pointer text-[13px]',
                activePanel === 'review'
                  ? 'font-bold text-blue-500 border-b-2 border-b-blue-500'
                  : 'font-normal text-slate-500 border-b-2 border-b-transparent',
              ].join(' ')}
            >
              Edge 검토 {pendingEdges.length > 0 ? `(${pendingEdges.length})` : ''}
            </button>
            <button
              onClick={() => setActivePanel('detail')}
              className={[
                'flex-1 py-2.5 border-none bg-transparent cursor-pointer text-[13px]',
                activePanel === 'detail'
                  ? 'font-bold text-blue-500 border-b-2 border-b-blue-500'
                  : 'font-normal text-slate-500 border-b-2 border-b-transparent',
              ].join(' ')}
            >
              노드 상세
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden p-3">
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
