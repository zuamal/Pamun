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
  const [toast, setToast] = useState<string | null>(null)
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
        // ignore toggle errors silently — could add toast here
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
      setToast(`저장 완료: ${res.filepath}`)
      setTimeout(() => setToast(null), 4000)
    } catch (err) {
      setToast(err instanceof Error ? err.message : '저장 실패')
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSaving(false)
    }
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 24px',
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/graph')}
          style={{
            padding: '6px 14px',
            borderRadius: 7,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#475569',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ← 그래프로
        </button>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', flex: 1 }}>
          영향 분석
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            padding: '7px 16px',
            borderRadius: 7,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#475569',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 13,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '저장 중...' : '세션 저장'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 13,
            zIndex: 2000,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            maxWidth: '80vw',
            textAlign: 'center',
          }}
        >
          {toast}
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: requirement toggle list */}
        <div
          style={{
            width: 360,
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px 10px',
              borderBottom: '1px solid #e2e8f0',
              background: '#fff',
              flexShrink: 0,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 10 }}>
              변경 예정 요구사항
              {changedCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: '#f97316',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '1px 8px',
                    fontSize: 11,
                  }}
                >
                  {changedCount}
                </span>
              )}
            </div>
            <button
              onClick={() => void handleAnalyze()}
              disabled={analyzing || changedCount === 0}
              style={{
                width: '100%',
                padding: '8px 0',
                borderRadius: 7,
                border: 'none',
                background: changedCount === 0 ? '#e2e8f0' : '#7c3aed',
                color: changedCount === 0 ? '#94a3b8' : '#fff',
                cursor: changedCount === 0 ? 'not-allowed' : analyzing ? 'wait' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {analyzing ? '분석 중...' : '영향 분석 실행'}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
            {changedCount === 0 && requirements.length > 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: '#94a3b8',
                  textAlign: 'center',
                  padding: '12px 0 16px',
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: 12,
                }}
              >
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {analyzing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#7c3aed',
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              <span>분석 중...</span>
            </div>
          )}

          {analysisError && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                color: '#b91c1c',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {analysisError}
            </div>
          )}

          {!impactResult && !analyzing && !analysisError && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60%',
                color: '#94a3b8',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 40 }}>📊</div>
              <div style={{ fontSize: 14 }}>
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
