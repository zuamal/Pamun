import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getDocument } from '../api/documents'

interface DocumentViewerProps {
  documentId: string
  charStart: number
  charEnd: number
  onClose: () => void
  /** When true, renders as an inline panel (no fixed overlay/backdrop) */
  panelMode?: boolean
}

export default function DocumentViewer({
  documentId,
  charStart,
  charEnd,
  onClose,
  panelMode = false,
}: DocumentViewerProps) {
  const [rawText, setRawText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const highlightRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setRawText(null)
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
      <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-7 text-slate-700">
        {before}
        {/* FR-9.4: scaleX wipe-reveal from left */}
        <motion.span
          ref={highlightRef}
          className="bg-yellow-200 font-semibold px-0.5 rounded text-slate-900 inline-block origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {highlighted}
        </motion.span>
        {after}
      </pre>
    )
  }

  const content = (
    <div className={panelMode ? 'flex flex-col h-full bg-white' : 'bg-white rounded-xl w-[70vw] max-w-[860px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden'}>
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-200 shrink-0">
        <div className="font-bold text-[15px] text-slate-900">원문 보기</div>
        <button
          onClick={onClose}
          className="bg-transparent border-none text-xl cursor-pointer text-slate-400 hover:text-slate-600 leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="text-slate-400 text-[13px] text-center py-6">로딩 중...</div>
        )}
        {error && (
          <div className="text-red-500 text-[13px]">{error}</div>
        )}
        {!loading && !error && renderText()}
      </div>
    </div>
  )

  if (panelMode) {
    return content
  }

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  )
}
