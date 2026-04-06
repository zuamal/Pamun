import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { listEdges, updateEdge, createEdge, deleteEdge } from '../api/edges'
import { listDocuments } from '../api/documents'
import { updateRequirement } from '../api/requirements'
import { getImpact, saveSession } from '../api/impact'
import { useGraphStore } from '../stores/graphStore'
import RequirementGraph from '../components/RequirementGraph'
import NodeDetailPanel from '../components/NodeDetailPanel'
import EdgeReviewPanel from '../components/EdgeReviewPanel'
import AddEdgeModal from '../components/AddEdgeModal'
import GraphFilter from '../components/GraphFilter'
import ImpactModeToggle from '../components/ImpactModeToggle'
import ImpactSummaryPanel from '../components/ImpactSummaryPanel'
import DocumentViewer from '../components/DocumentViewer'
import { toastError, toastSuccess } from '../lib/toast'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type RelationType = components['schemas']['RelationType']
type ImpactItemData = components['schemas']['ImpactItem']

export default function GraphPage() {
  const navigate = useNavigate()
  const {
    requirements,
    setRequirements,
    edges,
    setEdges,
    pendingConnection,
    setPendingConnection,
    impactMode,
    setImpactMode,
    impactResult,
    setImpactResult,
  } = useGraphStore()

  const [documents, setDocuments] = useState<Record<string, string>>({})
  const [selectedNode, setSelectedNode] = useState<Requirement | null>(null)
  const [activePanel, setActivePanel] = useState<'detail' | 'review'>('review')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Impact mode state
  const [selectedItem, setSelectedItem] = useState<ImpactItemData | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

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
  const changedCount = useMemo(() => requirements.filter((r) => r.changed).length, [requirements])

  // --- Normal mode handlers ---
  const handleNodeClick = useCallback((req: Requirement) => {
    setSelectedNode(req)
    setActivePanel('detail')
  }, [])

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

  const handleConnect = useCallback((sourceId: string, targetId: string) => {
    setPendingConnection({ sourceId, targetId })
  }, [setPendingConnection])

  const handleApprove = useCallback(async (edgeId: string) => {
    try {
      await updateEdge(edgeId, { status: 'approved' })
      const res = await listEdges()
      setEdges(res.edges)
      toastSuccess('Edge 승인됨')
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
      toastSuccess('Edge 추가됨')
    },
    [setEdges],
  )

  // --- Impact mode handlers ---
  const handleImpactNodeClick = useCallback(
    async (req: Requirement) => {
      setAnalyzing(true)
      try {
        const updated = await updateRequirement(req.id, { changed: !req.changed })
        const newReqs = requirements.map((r) => (r.id === updated.id ? updated : r))
        setRequirements(newReqs)

        const newChangedCount = newReqs.filter((r) => r.changed).length
        if (newChangedCount === 0) {
          setImpactResult(null)
        } else {
          const res = await getImpact()
          setImpactResult(res.result)
        }
      } catch (err) {
        toastError(err instanceof Error ? err.message : '업데이트 실패')
      } finally {
        setAnalyzing(false)
      }
    },
    [requirements, setRequirements, setImpactResult],
  )

  const toggleImpactMode = useCallback(() => {
    const next = !impactMode
    setImpactMode(next)
    // Reset all selection state on mode switch
    setSelectedNode(null)
    setSelectedItem(null)
    if (!next) {
      setImpactResult(null)
    }
  }, [impactMode, setImpactMode, setImpactResult])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await saveSession()
      toastSuccess(`저장 완료: ${res.filepath}`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }, [])

  // Resolve pending connection nodes
  const pendingSourceReq = pendingConnection
    ? requirements.find((r) => r.id === pendingConnection.sourceId) ?? null
    : null
  const pendingTargetReq = pendingConnection
    ? requirements.find((r) => r.id === pendingConnection.targetId) ?? null
    : null

  // Show impact summary panel when: impact mode ON + result exists + changed nodes exist
  const showSummaryPanel = impactMode && impactResult !== null && changedCount > 0

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
      {/* Header toolbar */}
      <div className="flex items-center px-5 py-2.5 bg-white border-b border-slate-200 gap-3 shrink-0">
        <div className="font-bold text-base text-slate-900 flex-1">의존관계 그래프</div>
        {(loading || analyzing) && (
          <span className="text-xs text-slate-400">
            {analyzing ? '분석 중...' : '로딩 중...'}
          </span>
        )}
        <ImpactModeToggle active={impactMode} onToggle={toggleImpactMode} />
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer text-[13px] disabled:opacity-70 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
        >
          {saving ? '저장 중...' : '세션 저장'}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden flex-col min-h-0">
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Graph area */}
          <div className="flex-1 overflow-hidden relative">
            <RequirementGraph
              requirements={requirements}
              edges={edges}
              selectedNodeId={impactMode ? null : (selectedNode?.id ?? null)}
              onNodeClick={impactMode ? (req) => void handleImpactNodeClick(req) : handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onConnect={handleConnect}
              impactMode={impactMode}
              impactResult={impactResult}
            />
          </div>

          {/* Right panel — normal mode: EdgeReview/NodeDetail | impact mode: DocumentViewer */}
          <AnimatePresence mode="wait">
            {!impactMode ? (
              <motion.div
                key="normal-panel"
                className="w-80 border-l border-slate-200 flex flex-col bg-slate-50 overflow-hidden"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
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
                <div className="flex-1 overflow-hidden p-3 min-h-0">
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

                {/* Filter */}
                <GraphFilter requirements={requirements} documents={documents} />
              </motion.div>
            ) : selectedItem ? (
              <motion.div
                key="doc-viewer-panel"
                className="w-96 border-l border-slate-200 overflow-hidden flex flex-col bg-white"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <DocumentViewer
                  documentId={selectedItem.document_id}
                  charStart={selectedItem.char_start}
                  charEnd={selectedItem.char_end}
                  onClose={() => setSelectedItem(null)}
                  panelMode
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Bottom: Impact Summary Panel */}
        <AnimatePresence>
          {showSummaryPanel && impactResult && (
            <ImpactSummaryPanel
              result={impactResult}
              selectedItemId={selectedItem?.requirement_id ?? null}
              onItemClick={setSelectedItem}
            />
          )}
        </AnimatePresence>
      </div>

      {/* AddEdgeModal — only in normal mode */}
      {!impactMode && pendingConnection && pendingSourceReq && pendingTargetReq && (
        <AddEdgeModal
          sourceReq={pendingSourceReq}
          targetReq={pendingTargetReq}
          onAdd={handleAddEdge}
          onClose={() => setPendingConnection(null)}
        />
      )}
    </div>
  )
}
