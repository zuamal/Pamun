import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Joyride, type EventHandler } from 'react-joyride'
import { updateRequirement } from '../api/requirements'
import { getImpact, saveSession } from '../api/impact'
import { useGraphStore } from '../stores/graphStore'
import { useTourStore, hasTourBeenSeen, markTourSeen } from '../stores/tourStore'
import { isDemoMode } from '../lib/demoApi'
import { IMPACT_STEPS, JOYRIDE_OPTIONS, JOYRIDE_LOCALE } from '../lib/tourSteps'
import RequirementGraph from '../components/RequirementGraph'
import DocumentViewer from '../components/DocumentViewer'
import ImpactItem from '../components/ImpactItem'
import { toastError, toastSuccess } from '../lib/toast'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type ImpactResult = components['schemas']['ImpactResult']
type ImpactItemData = components['schemas']['ImpactItem']

const PANEL_MIN = 200
const PANEL_MAX = 480
const PANEL_DEFAULT = 280

export default function ImpactPage() {
  const navigate = useNavigate()
  const { requirements, edges, setRequirements } = useGraphStore()

  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null)
  const [selectedItem, setSelectedItem] = useState<ImpactItemData | null>(null)
  const [activeTab, setActiveTab] = useState<'graph' | 'doc'>('graph')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT)
  const isDragging = useRef(false)

  const { isRunning, tourKey, setRunning } = useTourStore()
  const runTour = isRunning || (isDemoMode() && !hasTourBeenSeen('impact'))

  const handleTourCallback: EventHandler = (data) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      markTourSeen('impact')
      setRunning(false)
    }
  }

  // Recompute impact whenever requirements change
  const refreshImpact = useCallback(async () => {
    const changedCount = requirements.filter((r) => r.changed).length
    if (changedCount === 0) {
      setImpactResult(null)
      return
    }
    setAnalyzing(true)
    try {
      const res = await getImpact()
      setImpactResult(res.result)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '영향 분석 실패')
    } finally {
      setAnalyzing(false)
    }
  }, [requirements])

  // Run impact on mount if there are already changed requirements
  useEffect(() => {
    void refreshImpact()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleChanged = useCallback(async (req: Requirement) => {
    try {
      const updated = await updateRequirement(req.id, { changed: !req.changed })
      setRequirements(requirements.map((r) => (r.id === updated.id ? updated : r)))
      // Immediately rerun impact
      const nextReqs = requirements.map((r) => (r.id === updated.id ? updated : r))
      const changedCount = nextReqs.filter((r) => r.changed).length
      if (changedCount === 0) {
        setImpactResult(null)
        return
      }
      setAnalyzing(true)
      const res = await getImpact()
      setImpactResult(res.result)
    } catch (err) {
      toastError(err instanceof Error ? err.message : '업데이트 실패')
    } finally {
      setAnalyzing(false)
    }
  }, [requirements, setRequirements])

  const handleItemClick = useCallback((item: ImpactItemData) => {
    setSelectedItem(item)
    setActiveTab('doc')
  }, [])

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

  // --- Resizable panel drag ---
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const startX = e.clientX
    const startWidth = panelWidth

    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return
      const delta = ev.clientX - startX
      setPanelWidth(Math.max(PANEL_MIN, Math.min(PANEL_MAX, startWidth + delta)))
    }

    function onUp() {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [panelWidth])

  const changedCount = requirements.filter((r) => r.changed).length

  const allImpactItems = [
    ...(impactResult?.affected_items ?? []),
    ...(impactResult?.review_items ?? []),
  ]

  if (requirements.length === 0) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4 text-slate-500">
        <div className="text-5xl">🔍</div>
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
      steps={IMPACT_STEPS}
      run={runTour}
      continuous
      options={JOYRIDE_OPTIONS}
      locale={JOYRIDE_LOCALE}
      onEvent={handleTourCallback}
    />
    <div className="flex h-full flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center px-5 py-2.5 bg-white border-b border-slate-200 gap-3 shrink-0">
        <div className="font-bold text-base text-slate-900 flex-1">영향 분석</div>
        {analyzing && <span className="text-xs text-slate-400 animate-pulse">분석 중...</span>}
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer text-[13px] disabled:opacity-70 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
        >
          {saving ? '저장 중...' : '세션 저장'}
        </button>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left panel (resizable) */}
        <div
          className="flex flex-col border-r border-slate-200 bg-white shrink-0 overflow-hidden"
          style={{ width: panelWidth }}
        >
          {/* Requirements list — top half */}
          <div className="flex flex-col min-h-0" style={{ flex: '0 0 55%' }} data-tour="changed-toggle">
            <div className="px-3 py-2 border-b border-slate-100 shrink-0">
              <span className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
                요구사항
              </span>
              {changedCount > 0 && (
                <span className="ml-2 text-[11px] text-orange-600 font-bold">
                  {changedCount}개 변경 예정
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
              {requirements.map((req) => (
                <button
                  key={req.id}
                  onClick={() => void handleToggleChanged(req)}
                  className={[
                    'w-full text-left px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer',
                    req.changed
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={[
                        'mt-0.5 shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] font-bold transition-colors',
                        req.changed
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-slate-300 bg-white',
                      ].join(' ')}
                    >
                      {req.changed ? '✓' : ''}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 truncate">{req.display_label}</div>
                      <div className="text-slate-800 font-medium leading-snug line-clamp-2">{req.title}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Impact results — bottom half */}
          <div className="flex flex-col border-t border-slate-200 min-h-0" style={{ flex: '0 0 45%' }} data-tour="impact-result">
            <div className="px-3 py-2 border-b border-slate-100 shrink-0">
              <span className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
                영향 분석 결과
              </span>
              {impactResult && (
                <span className="ml-2 text-[11px] text-slate-500">
                  <span className="text-red-600 font-bold">{impactResult.total_affected}</span>
                  {' '}영향 ·{' '}
                  <span className="text-amber-600 font-bold">{impactResult.total_review}</span>
                  {' '}검토
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {changedCount === 0 ? (
                <p className="text-[12px] text-slate-400 text-center py-4">
                  요구사항을 클릭해 변경 예정으로 표시하세요
                </p>
              ) : analyzing ? (
                <p className="text-[12px] text-slate-400 text-center py-4 animate-pulse">
                  분석 중...
                </p>
              ) : allImpactItems.length === 0 ? (
                <p className="text-[12px] text-slate-400 text-center py-4">
                  영향받는 요구사항 없음
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                  {allImpactItems.map((item) => (
                    <ImpactItem
                      key={item.requirement_id}
                      item={item}
                      selected={selectedItem?.requirement_id === item.requirement_id}
                      onClick={handleItemClick}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={startResize}
          className="w-1 bg-slate-200 hover:bg-blue-400 cursor-col-resize transition-colors shrink-0"
        />

        {/* Right area — tabs */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200 bg-white shrink-0">
            <button
              onClick={() => setActiveTab('graph')}
              className={[
                'px-5 py-2.5 border-none bg-transparent cursor-pointer text-[13px]',
                activeTab === 'graph'
                  ? 'font-bold text-blue-500 border-b-2 border-b-blue-500'
                  : 'font-normal text-slate-500 border-b-2 border-b-transparent hover:text-slate-700',
              ].join(' ')}
            >
              그래프 뷰
            </button>
            <button
              onClick={() => setActiveTab('doc')}
              className={[
                'px-5 py-2.5 border-none bg-transparent cursor-pointer text-[13px]',
                activeTab === 'doc'
                  ? 'font-bold text-blue-500 border-b-2 border-b-blue-500'
                  : 'font-normal text-slate-500 border-b-2 border-b-transparent hover:text-slate-700',
              ].join(' ')}
            >
              원문 뷰어
              {selectedItem && <span className="ml-1 text-[11px] text-blue-400">●</span>}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'graph' ? (
              <RequirementGraph
                requirements={requirements}
                edges={edges}
                selectedNodeId={null}
                onNodeClick={() => {}}
                onEdgeClick={() => {}}
                onConnect={() => {}}
                impactMode={true}
                impactResult={impactResult}
              />
            ) : selectedItem ? (
              <DocumentViewer
                documentId={selectedItem.document_id}
                charStart={selectedItem.char_start}
                charEnd={selectedItem.char_end}
                onClose={() => setActiveTab('graph')}
                panelMode
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm flex-col gap-2">
                <span className="text-3xl">📄</span>
                <span>영향 항목을 클릭하면 원문을 볼 수 있습니다</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
