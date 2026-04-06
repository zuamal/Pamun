import { useState } from 'react'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type RelationType = components['schemas']['RelationType']

interface AddEdgeModalProps {
  sourceReq: Requirement
  targetReq: Requirement
  onAdd: (sourceId: string, targetId: string, relationType: RelationType, evidence: string) => Promise<void>
  onClose: () => void
}

export default function AddEdgeModal({ sourceReq, targetReq, onAdd, onClose }: AddEdgeModalProps) {
  const [relationType, setRelationType] = useState<RelationType>('depends_on')
  const [evidence, setEvidence] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onAdd(sourceReq.id, targetReq.id, relationType, evidence)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/35 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-7 w-[440px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold text-base text-slate-900 mb-5">Edge 추가</div>

        {/* Connection display */}
        <div className="flex items-center gap-2 mb-5 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-400 mb-0.5">Source</div>
            <div className="text-xs font-semibold text-indigo-600">{sourceReq.display_label}</div>
            <div className="text-xs text-slate-700 truncate">{sourceReq.title}</div>
          </div>
          <div className="text-slate-400 text-lg shrink-0">→</div>
          <div className="flex-1 min-w-0 text-right">
            <div className="text-[10px] text-slate-400 mb-0.5">Target</div>
            <div className="text-xs font-semibold text-indigo-600">{targetReq.display_label}</div>
            <div className="text-xs text-slate-700 truncate">{targetReq.title}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <div className="text-xs text-slate-500 font-semibold mb-1">관계 유형</div>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as RelationType)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-[13px] text-slate-900 bg-white focus:outline-none focus:border-blue-400"
            >
              <option value="depends_on">depends_on (의존)</option>
              <option value="related_to">related_to (관련)</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-semibold mb-1">근거 (evidence)</div>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="근거 텍스트를 입력하세요"
              rows={3}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-[13px] text-slate-900 bg-white focus:outline-none focus:border-blue-400 resize-y font-[inherit]"
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-md">{error}</div>
          )}

          <div className="flex gap-2.5 justify-end mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-[13px] text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg border-none bg-blue-500 text-white cursor-pointer text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-70 hover:bg-blue-600 transition-colors"
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
