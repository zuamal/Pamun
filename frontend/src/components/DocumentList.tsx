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

export default function DocumentList({ documents, onDelete, disabled = false }: Props) {
  if (documents.length === 0) {
    return <p className="text-slate-400 text-sm">업로드된 문서가 없습니다.</p>
  }

  return (
    <ul className="list-none p-0 m-0">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-slate-100 mb-2"
        >
          <span className="flex-1 font-medium">{doc.filename}</span>
          <span className="text-xs bg-slate-200 rounded px-1.5 py-0.5 text-slate-600">
            {FORMAT_LABEL[doc.format] ?? doc.format}
          </span>
          <button
            onClick={() => onDelete(doc.id)}
            disabled={disabled}
            className="border border-red-300 text-red-500 rounded px-2 py-0.5 text-sm bg-transparent disabled:cursor-not-allowed hover:bg-red-50 cursor-pointer"
          >
            삭제
          </button>
        </li>
      ))}
    </ul>
  )
}
