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

  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }
  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    color: '#1e293b',
    background: '#fff',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          width: 440,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 20 }}>
          Edge 수동 추가
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={labelStyle}>Source 요구사항</div>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} style={selectStyle}>
              <option value="">선택...</option>
              {selectedNodes.map((r) => (
                <option key={r.id} value={r.id}>{r.display_label} — {r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={labelStyle}>Target 요구사항</div>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={selectStyle}>
              <option value="">선택...</option>
              {selectedNodes.map((r) => (
                <option key={r.id} value={r.id}>{r.display_label} — {r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={labelStyle}>관계 유형</div>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as RelationType)}
              style={selectStyle}
            >
              <option value="depends_on">depends_on (의존)</option>
              <option value="related_to">related_to (관련)</option>
            </select>
          </div>

          <div>
            <div style={labelStyle}>근거 (evidence)</div>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="근거 텍스트를 입력하세요"
              rows={3}
              style={{
                ...selectStyle,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#ef4444', background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: 7,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                cursor: 'pointer',
                fontSize: 13,
                color: '#475569',
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 18px',
                borderRadius: 7,
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
