import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Joyride, type EventHandler } from 'react-joyride'
import { inferEdgesSSE, listEdges } from '../api/edges'
import {
  deleteRequirement,
  mergeRequirements,
  splitRequirement,
  updateRequirement,
} from '../api/requirements'
import RequirementList from '../components/RequirementList'
import SplitModal from '../components/SplitModal'
import ProgressModal from '../components/ProgressModal'
import FloatingActionBar from '../components/FloatingActionBar'
import EmptyState from '../components/EmptyState'
import { useDocumentStore } from '../stores/documentStore'
import { useGraphStore } from '../stores/graphStore'
import { useTourStore, hasTourBeenSeen, markTourSeen } from '../stores/tourStore'
import { isDemoMode } from '../lib/demoApi'
import { REVIEW_STEPS, JOYRIDE_OPTIONS, JOYRIDE_LOCALE } from '../lib/tourSteps'
import { toastError, toastSuccess } from '../lib/toast'
import type { components } from '../api/types.generated'
import type { ProgressEvent } from '../api/sseTypes'

type Requirement = components['schemas']['Requirement']

export default function ReviewPage() {
  const navigate = useNavigate()
  const { documents } = useDocumentStore()
  const { requirements, setRequirements, setEdges } = useGraphStore()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [splitTarget, setSplitTarget] = useState<Requirement | null>(null)
  const [inferring, setInferring] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')

  const { isRunning, tourKey, setRunning } = useTourStore()
  const runTour = isRunning || (isDemoMode() && !hasTourBeenSeen('review'))

  const handleTourCallback: EventHandler = (data) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      markTourSeen('review')
      setRunning(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleTitleUpdate(id: string, title: string) {
    try {
      const updated = await updateRequirement(id, { title })
      setRequirements(requirements.map((r) => (r.id === id ? updated : r)))
    } catch (e) {
      toastError(e instanceof Error ? e.message : '수정 실패')
    }
  }

  async function handleDeleteSelected() {
    try {
      await Promise.all(selectedIds.map((id) => deleteRequirement(id)))
      setRequirements(requirements.filter((r) => !selectedIds.includes(r.id)))
      toastSuccess(`${selectedIds.length}개 요구사항 삭제됨`)
      setSelectedIds([])
    } catch (e) {
      toastError(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  async function handleMerge(ids: string[]) {
    try {
      const merged = await mergeRequirements({ requirement_ids: ids })
      setRequirements([
        ...requirements.filter((r) => !ids.includes(r.id)),
        merged,
      ])
      toastSuccess('요구사항이 병합되었습니다')
      setSelectedIds([])
    } catch (e) {
      toastError(e instanceof Error ? e.message : '병합 실패')
    }
  }

  async function handleSplitConfirm(id: string, offset: number) {
    setSplitTarget(null)
    try {
      const parts = await splitRequirement({ requirement_id: id, split_offset: offset })
      setRequirements([
        ...requirements.filter((r) => r.id !== id),
        ...parts,
      ])
      toastSuccess('요구사항이 분리되었습니다')
    } catch (e) {
      toastError(e instanceof Error ? e.message : '분리 실패')
    }
  }

  async function handleInfer() {
    setInferring(true)
    setProgress(0)
    setProgressMsg('추론 준비 중...')

    try {
      await inferEdgesSSE(
        { requirement_ids: null },
        (event: ProgressEvent) => {
          setProgress(event.progress)
          setProgressMsg(event.message)
          if (event.step === 'error') {
            throw new Error(event.message)
          }
        },
      )
      const edgeRes = await listEdges()
      setEdges(edgeRes.edges)
      navigate('/graph')
    } catch (e) {
      toastError(e instanceof Error ? e.message : '추론 실패')
    } finally {
      setInferring(false)
    }
  }

  return (
    <>
    <Joyride
      key={tourKey}
      steps={REVIEW_STEPS}
      run={runTour}
      continuous
      options={JOYRIDE_OPTIONS}
      locale={JOYRIDE_LOCALE}
      onEvent={handleTourCallback}
    />
    <div className="flex-1 overflow-y-auto">
    <div className="max-w-3xl mx-auto py-8 px-4 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="m-0 text-xl font-bold text-slate-900">요구사항 검토</h1>
        {requirements.length > 0 && (
          <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2.5 py-0.5 font-medium">
            {requirements.length}개
          </span>
        )}
      </div>

      {requirements.length === 0 ? (
        <EmptyState
          icon="📋"
          title="파싱된 요구사항이 없습니다"
          description="먼저 문서를 업로드하고 파싱을 실행해주세요"
          action={
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold cursor-pointer border-none hover:bg-blue-600 transition-colors"
            >
              문서 업로드로
            </button>
          }
        />
      ) : (
        <>
          <div data-tour="req-list">
            <RequirementList
              requirements={requirements}
              documents={documents}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onTitleUpdate={handleTitleUpdate}
              onSplit={setSplitTarget}
              disabled={inferring}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <button
              data-tour="infer-btn"
              onClick={() => void handleInfer()}
              disabled={inferring || requirements.length === 0}
              className="px-6 py-2.5 rounded-lg border-none bg-violet-700 text-white font-bold text-base cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-violet-600 transition-all duration-150"
            >
              의존관계 추론 시작
            </button>
          </div>
        </>
      )}

      <SplitModal
        requirement={splitTarget}
        onConfirm={handleSplitConfirm}
        onClose={() => setSplitTarget(null)}
      />

      <FloatingActionBar
        selectedCount={selectedIds.length}
        onMerge={() => void handleMerge(selectedIds)}
        onDelete={() => void handleDeleteSelected()}
        onDeselect={() => setSelectedIds([])}
        disabled={inferring}
      />

      {inferring && <ProgressModal message={progressMsg} progress={progress} />}
    </div>
    </div>
    </>
  )
}
