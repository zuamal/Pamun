import { useRef, useState } from 'react'

const ACCEPTED = ['.md', '.docx', '.pdf']
const ACCEPTED_MIME = [
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/plain', // some OS sends .md as text/plain
]

interface Props {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

function isAccepted(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED.includes(ext) || ACCEPTED_MIME.includes(file.type)
}

export default function FileDropzone({ onFiles, disabled = false }: Props) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    const list = Array.from(files)
    const invalid = list.filter((f) => !isAccepted(f))
    if (invalid.length > 0) {
      setError(`지원하지 않는 파일 형식: ${invalid.map((f) => f.name).join(', ')} (.md, .docx, .pdf만 허용)`)
      return
    }
    if (list.length > 5) {
      setError('최대 5개 파일까지 업로드할 수 있습니다.')
      return
    }
    onFiles(list)
  }

  return (
    <div>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) handleFiles(e.dataTransfer.files)
        }}
        style={{
          border: `2px dashed ${dragging ? '#3b82f6' : '#cbd5e1'}`,
          borderRadius: 8,
          padding: '2rem',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: dragging ? '#eff6ff' : '#f8fafc',
          transition: 'all 0.15s',
        }}
      >
        <p style={{ margin: 0, color: '#64748b' }}>
          파일을 드래그하거나 <strong>클릭</strong>하여 선택
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          .md / .docx / .pdf · 최대 5개
        </p>
      </div>
      {error && (
        <p style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.875rem' }}>{error}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".md,.docx,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
