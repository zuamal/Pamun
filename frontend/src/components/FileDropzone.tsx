import { useRef, useState } from 'react'

const ACCEPTED = ['.md', '.docx', '.pdf']
const ACCEPTED_MIME = [
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/plain',
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
        className={[
          'border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50',
        ].join(' ')}
      >
        <div className={[
          'text-4xl mb-3 transition-transform duration-200 select-none',
          dragging ? 'scale-110' : 'scale-100',
        ].join(' ')}>
          📂
        </div>
        <p className="m-0 text-slate-500 font-medium">
          파일을 드래그하거나 <strong>클릭</strong>하여 선택
        </p>
        <p className="mt-1.5 mb-0 text-sm text-slate-400">
          .md / .docx / .pdf · 최대 5개
        </p>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".md,.docx,.pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
