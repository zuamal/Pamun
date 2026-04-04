import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { inferEdges } from '../api/edges'
import {
  deleteRequirement,
  listRequirements,
  mergeRequirements,
  splitRequirement,
  updateRequirement,
} from '../api/requirements'
import RequirementList from '../components/RequirementList'
import SplitModal from '../components/SplitModal'
import { useDocumentStore } from '../stores/documentStore'
import { useGraphStore } from '../stores/graphStore'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']

export default function ReviewPage() {
  const navigate = useNavigate()
  const { documents } = useDocumentStore()
  const { requirements, setRequirements } = useGraphStore()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [splitTarget, setSplitTarget] = useState<Requirement | null>(null)
  const [inferring, setInferring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listRequirements()
      .then(setRequirements)
      .catch(() => {/* server may not be running */})
  }, [setRequirements])

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleTitleUpdate(id: string, title: string) {
    setError(null)
    try {
      const updated = await updateRequirement(id, { title })
      setRequirements(requirements.map((r) => (r.id === id ? updated : r)))
    } catch (e) {
      setError(e instanceof Error ? e.message : '수정 실패')
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await deleteRequirement(id)
      setRequirements(requirements.filter((r) => r.id !== id))
      setSelectedIds((prev) => prev.filter((x) => x !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  async function handleMerge(ids: string[]) {
    setError(null)
    try {
      const merged = await mergeRequirements({ requirement_ids: ids })
      setRequirements([
        ...requirements.filter((r) => !ids.includes(r.id)),
        merged,
      ])
      setSelectedIds([])
    } catch (e) {
      setError(e instanceof Error ? e.message : '병합 실패')
    }
  }

  async function handleSplitConfirm(id: string, offset: number) {
    setError(null)
    setSplitTarget(null)
    try {
      const parts = await splitRequirement({ requirement_id: id, split_offset: offset })
      setRequirements([
        ...requirements.filter((r) => r.id !== id),
        ...parts,
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : '분리 실패')
    }
  }

  async function handleInfer() {
    setError(null)
    setInferring(true)
    try {
      await inferEdges({ requirement_ids: null })
      navigate('/graph')
    } catch (e) {
      setError(e instanceof Error ? e.message : '추론 실패')
    } finally {
      setInferring(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.3rem 0.75rem', cursor: 'pointer' }}
        >
          ← 업로드
        </button>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>요구사항 검토</h1>
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>({requirements.length}개)</span>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6,
          padding: '0.75rem 1rem', color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem',
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
          >
            ✕
          </button>
        </div>
      )}

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

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
        <button
          onClick={handleInfer}
          disabled={inferring || requirements.length === 0}
          style={{
            padding: '0.65rem 1.5rem', borderRadius: 8, border: 'none',
            background: inferring || requirements.length === 0 ? '#cbd5e1' : '#7c3aed',
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            cursor: inferring || requirements.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {inferring ? '추론 중… (최대 120초)' : '의존관계 추론 시작'}
        </button>
      </div>

      <SplitModal
        requirement={splitTarget}
        onConfirm={handleSplitConfirm}
        onClose={() => setSplitTarget(null)}
      />
    </div>
  )
}
