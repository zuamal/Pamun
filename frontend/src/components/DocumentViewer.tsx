import { useEffect, useRef, useState } from 'react'
import { getDocument } from '../api/documents'

interface DocumentViewerProps {
  documentId: string
  charStart: number
  charEnd: number
  onClose: () => void
}

export default function DocumentViewer({
  documentId,
  charStart,
  charEnd,
  onClose,
}: DocumentViewerProps) {
  const [rawText, setRawText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const highlightRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getDocument(documentId)
      .then((doc) => setRawText(doc.raw_text))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '로드 실패'))
      .finally(() => setLoading(false))
  }, [documentId])

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [rawText])

  const renderText = () => {
    if (!rawText) return null
    const before = rawText.slice(0, charStart)
    const highlighted = rawText.slice(charStart, charEnd)
    const after = rawText.slice(charEnd)

    return (
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          lineHeight: 1.7,
          color: '#334155',
        }}
      >
        {before}
        <mark
          ref={(el) => { highlightRef.current = el }}
          style={{
            background: '#fef08a',
            borderRadius: 3,
            padding: '0 1px',
            color: '#1e293b',
          }}
        >
          {highlighted}
        </mark>
        {after}
      </pre>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
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
          width: '70vw',
          maxWidth: 860,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>원문 보기</div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#94a3b8',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading && (
            <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              로딩 중...
            </div>
          )}
          {error && (
            <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
          )}
          {!loading && !error && renderText()}
        </div>
      </div>
    </div>
  )
}
