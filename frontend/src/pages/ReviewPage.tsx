import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useDocumentStore } from '../stores/documentStore'
import { useGraphStore } from '../stores/graphStore'
import { toastError } from '../lib/toast'
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

  async function handleDelete(id: string) {
    try {
      await deleteRequirement(id)
      setRequirements(requirements.filter((r) => r.id !== id))
      setSelectedIds((prev) => prev.filter((x) => x !== id))
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
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="bg-transparent border border-slate-300 rounded-md px-3 py-1 cursor-pointer text-sm"
        >
          ← 업로드
        </button>
        <h1 className="m-0 text-[1.4rem] font-bold">요구사항 검토</h1>
        <span className="text-slate-500 text-sm">({requirements.length}개)</span>
      </div>

      <RequirementList
        requirements={requirements}
        documents={documents}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onTitleUpdate={handleTitleUpdate}
        onDelete={handleDelete}
        onSplit={setSplitTarget}
        onMerge={handleMerge}
        disabled={inferring}
      />

      <div className="mt-8 pt-6 border-t border-slate-200">
        <button
          onClick={() => void handleInfer()}
          disabled={inferring || requirements.length === 0}
          className="px-6 py-2.5 rounded-lg border-none bg-violet-700 text-white font-bold text-base cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          의존관계 추론 시작
        </button>
      </div>

      <SplitModal
        requirement={splitTarget}
        onConfirm={handleSplitConfirm}
        onClose={() => setSplitTarget(null)}
      />

      {inferring && <ProgressModal message={progressMsg} progress={progress} />}
    </div>
  )
}
