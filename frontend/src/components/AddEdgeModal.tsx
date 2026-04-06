import { useState } from 'react'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type RelationType = components['schemas']['RelationType']

interface AddEdgeModalProps {
  selectedNodes: Requirement[]
  onAdd: (sourceId: string, targetId: string, relationType: RelationType, evidence: string) => Promise<void>
  onClose: () => void
}

export default function AddEdgeModal({ selectedNodes, onAdd, onClose }: AddEdgeModalProps) {
  const [sourceId, setSourceId] = useState(selectedNodes[0]?.id ?? '')
  const [targetId, setTargetId] = useState(selectedNodes[1]?.id ?? '')
  const [relationType, setRelationType] = useState<RelationType>('depends_on')
  const [evidence, setEvidence] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceId || !targetId || sourceId === targetId) {
      setError('Source와 Target을 서로 다르게 선택하세요.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onAdd(sourceId, targetId, relationType, evidence)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const selectCls = 'w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-[13px] text-slate-900 bg-white focus:outline-none focus:border-blue-400'
  const labelCls = 'text-xs text-slate-500 font-semibold mb-1'

  return (
    <div
      className="fixed inset-0 bg-black/35 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-7 w-[440px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold text-base text-slate-900 mb-5">Edge 수동 추가</div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <div className={labelCls}>Source 요구사항</div>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={selectCls}>
              <option value="">선택...</option>
              {selectedNodes.map((r) => (
                <option key={r.id} value={r.id}>{r.display_label} — {r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <div className={labelCls}>Target 요구사항</div>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={selectCls}>
              <option value="">선택...</option>
              {selectedNodes.map((r) => (
                <option key={r.id} value={r.id}>{r.display_label} — {r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <div className={labelCls}>관계 유형</div>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as RelationType)}
              className={selectCls}
            >
              <option value="depends_on">depends_on (의존)</option>
              <option value="related_to">related_to (관련)</option>
            </select>
          </div>

          <div>
            <div className={labelCls}>근거 (evidence)</div>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="근거 텍스트를 입력하세요"
              rows={3}
              className={`${selectCls} resize-y font-[inherit]`}
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2.5 justify-end mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-[13px] text-slate-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg border-none bg-blue-500 text-white cursor-pointer text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
