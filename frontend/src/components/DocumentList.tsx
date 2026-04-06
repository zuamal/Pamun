import type { components } from '../api/types.generated'

type Document = components['schemas']['Document']

interface Props {
  documents: Document[]
  onDelete: (id: string) => void
  disabled?: boolean
}

const FORMAT_LABEL: Record<string, string> = {
  markdown: 'Markdown',
  docx: 'DOCX',
  pdf: 'PDF',
}

const FORMAT_ICON: Record<string, string> = {
  markdown: '📝',
  docx: '📄',
  pdf: '📕',
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function DocumentList({ documents, onDelete, disabled = false }: Props) {
  if (documents.length === 0) return null

  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm"
        >
          <span className="text-2xl shrink-0">
            {FORMAT_ICON[doc.format] ?? '📄'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-900 truncate">{doc.filename}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {FORMAT_LABEL[doc.format] ?? doc.format} · {formatSize(doc.file_size)}
            </div>
          </div>
          <button
            onClick={() => onDelete(doc.id)}
            disabled={disabled}
            title="삭제"
            className="text-slate-400 hover:text-red-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-lg leading-none p-1 rounded"
          >
            🗑️
          </button>
        </li>
      ))}
    </ul>
  )
}
