import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Joyride, type EventHandler } from 'react-joyride'
import { listEdges, updateEdge, createEdge, deleteEdge } from '../api/edges'
import { listDocuments } from '../api/documents'
import { saveSession } from '../api/impact'
import { isDemoMode } from '../lib/demoApi'
import { useGraphStore } from '../stores/graphStore'
import { useTourStore, hasTourBeenSeen, markTourSeen } from '../stores/tourStore'
import { GRAPH_STEPS, JOYRIDE_OPTIONS, JOYRIDE_LOCALE } from '../lib/tourSteps'
import RequirementGraph from '../components/RequirementGraph'
import GraphLegend from '../components/GraphLegend'
import NodeDetailPanel from '../components/NodeDetailPanel'
import EdgeReviewPanel from '../components/EdgeReviewPanel'
import AddEdgeModal from '../components/AddEdgeModal'
import GraphFilter from '../components/GraphFilter'
import { toastError, toastSuccess } from '../lib/toast'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type RelationType = components['schemas']['RelationType']

export default function GraphPage() {
  const navigate = useNavigate()
  const {
    requirements,
    edges,
    setEdges,
    pendingConnection,
    setPendingConnection,
    setPendingSource,
  } = useGraphStore()

  const [documents, setDocuments] = useState<Record<string, string>>({})
  const [selectedNode, setSelectedNode] = useState<Requirement | null>(null)
  const [activePanel, setActivePanel] = useState<'detail' | 'review'>('review')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState(false)

  const { isRunning, tourKey, setRunning } = useTourStore()
  const runTour = isRunning || (isDemoMode() && !hasTourBeenSeen('graph'))

  const handleTourCallback: EventHandler = (data) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      markTourSeen('graph')
      setRunning(false)
    }
  }

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
    setConnectMode(false)
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectMode(false)
        setPendingSource(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setPendingSource])

  const pendingSourceReq = pendingConnection
    ? requirements.find((r) => r.id === pendingConnection.sourceId) ?? null
    : null
  const pendingTargetReq = pendingConnection
    ? requirements.find((r) => r.id === pendingConnection.targetId) ?? null
    : null

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
    <>
    <Joyride
      key={tourKey}
      steps={GRAPH_STEPS}
      run={runTour}
      continuous
      options={JOYRIDE_OPTIONS}
      locale={JOYRIDE_LOCALE}
      onEvent={handleTourCallback}
    />
    <div className="flex h-full flex-col">
      {/* Header toolbar */}
      <div className="flex items-center px-5 py-2.5 glass-panel border-b gap-3 shrink-0">
        <div className="font-bold text-base text-slate-900 flex-1">의존관계 그래프</div>
        {loading && <span className="text-xs text-slate-400">로딩 중...</span>}
        <button
          onClick={() => {
            const next = !connectMode
            setConnectMode(next)
            if (!next) setPendingSource(null)
          }}
          title={connectMode ? '연결 모드 취소 (ESC)' : '노드를 클릭해 Edge를 추가합니다'}
          className={[
            'px-4 py-1.5 rounded-lg border text-[13px] cursor-pointer transition-all duration-150',
            connectMode
              ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
          ].join(' ')}
        >
          {connectMode ? '연결 중... (취소)' : '노드 연결'}
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving || isDemoMode()}
          title={isDemoMode() ? '데모 모드에서는 세션 저장이 지원되지 않습니다' : undefined}
          className="px-4 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer text-[13px] disabled:opacity-70 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
        >
          {saving ? '저장 중...' : '세션 저장'}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Graph area — full height */}
        <div className="flex-1 overflow-hidden relative">
          {/* Small anchor for tour tooltip — avoids clipping from targeting the full-size div */}
          <div data-tour="graph-anchor" className="absolute top-4 left-4 w-0 h-0 pointer-events-none" />
          <GraphLegend documents={documents} />
          <RequirementGraph
            requirements={requirements}
            edges={edges}
            selectedNodeId={selectedNode?.id ?? null}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onConnect={handleConnect}
            connectMode={connectMode}
            hoveredEdgeId={hoveredEdgeId}
          />
        </div>

        {/* Right panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key="normal-panel"
            data-tour="edge-panel"
            className="w-80 border-l glass-panel flex flex-col overflow-hidden transition-transform duration-300 ease-out"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Panel tabs */}
            <div className="flex border-b border-white/30 dark:border-slate-600/30 shrink-0">
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
                  documents={documents}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdgeHover={setHoveredEdgeId}
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
        </AnimatePresence>
      </div>

      {/* AddEdgeModal */}
      {pendingConnection && pendingSourceReq && pendingTargetReq && (
        <AddEdgeModal
          sourceReq={pendingSourceReq}
          targetReq={pendingTargetReq}
          onAdd={handleAddEdge}
          onClose={() => setPendingConnection(null)}
        />
      )}
    </div>
    </>
  )
}
