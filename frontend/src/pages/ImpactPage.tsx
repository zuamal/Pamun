import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImpact, saveSession } from '../api/impact'
import { listRequirements, updateRequirement } from '../api/requirements'
import { listDocuments } from '../api/documents'
import { useGraphStore } from '../stores/graphStore'
import { useImpactStore } from '../stores/impactStore'
import RequirementToggleList from '../components/RequirementToggleList'
import ImpactResultPanel from '../components/ImpactResultPanel'
import DocumentViewer from '../components/DocumentViewer'
import { toastSuccess, toastError } from '../lib/toast'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type ImpactItemData = components['schemas']['ImpactItem']

export default function ImpactPage() {
  const navigate = useNavigate()
  const { requirements, setRequirements } = useGraphStore()
  const { impactResult, setImpactResult } = useImpactStore()

  const [documents, setDocuments] = useState<Record<string, string>>({})
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<ImpactItemData | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void Promise.all([
      listRequirements().then(setRequirements),
      listDocuments().then((res) => {
        const map: Record<string, string> = {}
        for (const doc of res.documents) map[doc.id] = doc.filename
        setDocuments(map)
      }),
    ])
  }, [setRequirements])

  const changedCount = requirements.filter((r) => r.changed).length

  const handleToggle = useCallback(
    async (req: Requirement, changed: boolean) => {
      try {
        const updated = await updateRequirement(req.id, { changed })
        setRequirements(requirements.map((r) => (r.id === updated.id ? updated : r)))
      } catch {
        // ignore
      }
    },
    [requirements, setRequirements],
  )

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    setAnalysisError(null)
    setImpactResult(null)
    try {
      const res = await getImpact()
      setImpactResult(res.result)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : '분석 실패')
    } finally {
      setAnalyzing(false)
    }
  }, [setImpactResult])

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

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center px-6 py-2.5 bg-white border-b border-slate-200 gap-3 shrink-0">
        <button
          onClick={() => navigate('/graph')}
          className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer text-[13px]"
        >
          ← 그래프로
        </button>
        <div className="font-bold text-base text-slate-900 flex-1">영향 분석</div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer text-[13px] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? '저장 중...' : '세션 저장'}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: requirement toggle list */}
        <div className="w-[360px] border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 pt-3.5 pb-2.5 border-b border-slate-200 bg-white shrink-0">
            <div className="font-semibold text-[13px] text-slate-900 mb-2.5">
              변경 예정 요구사항
              {changedCount > 0 && (
                <span className="ml-2 bg-orange-500 text-white rounded-full px-2 py-0.5 text-[11px]">
                  {changedCount}
                </span>
              )}
            </div>
            <button
              onClick={() => void handleAnalyze()}
              disabled={analyzing || changedCount === 0}
              className={[
                'w-full py-2 rounded-lg border-none text-[13px] font-semibold',
                changedCount === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : analyzing
                    ? 'bg-violet-700 text-white cursor-wait'
                    : 'bg-violet-700 text-white cursor-pointer',
              ].join(' ')}
            >
              {analyzing ? '분석 중...' : '영향 분석 실행'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {changedCount === 0 && requirements.length > 0 && (
              <div className="text-[13px] text-slate-400 text-center py-3 pb-4 border-b border-slate-100 mb-3">
                변경 예정으로 표시된 요구사항이 없습니다
              </div>
            )}
            <RequirementToggleList
              requirements={requirements}
              documents={documents}
              onToggle={(req, changed) => void handleToggle(req, changed)}
            />
          </div>
        </div>

        {/* Right: impact results */}
        <div className="flex-1 overflow-y-auto p-6">
          {analyzing && (
            <div className="flex items-center gap-2.5 text-violet-700 text-[14px] mb-5">
              <span>분석 중...</span>
            </div>
          )}

          {analysisError && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[13px] mb-4">
              {analysisError}
            </div>
          )}

          {!impactResult && !analyzing && !analysisError && (
            <div className="flex flex-col items-center justify-center h-[60%] text-slate-400 gap-3">
              <div className="text-[40px]">📊</div>
              <div className="text-[14px]">
                왼쪽에서 변경 예정 요구사항을 선택하고 분석을 실행하세요
              </div>
            </div>
          )}

          {impactResult && (
            <ImpactResultPanel
              result={impactResult}
              selectedItemId={selectedItem?.requirement_id ?? null}
              onItemClick={setSelectedItem}
            />
          )}
        </div>
      </div>

      {/* Document viewer modal */}
      {selectedItem && (
        <DocumentViewer
          documentId={selectedItem.document_id}
          charStart={selectedItem.char_start}
          charEnd={selectedItem.char_end}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}
