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
    return <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>업로드된 문서가 없습니다.</p>
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {documents.map((doc) => (
        <li
          key={doc.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.6rem 0.75rem',
            borderRadius: 6,
            background: '#f1f5f9',
            marginBottom: '0.5rem',
          }}
        >
          <span style={{ flex: 1, fontWeight: 500 }}>{doc.filename}</span>
          <span
            style={{
              fontSize: '0.75rem',
              background: '#e2e8f0',
              borderRadius: 4,
              padding: '0.15rem 0.4rem',
              color: '#475569',
            }}
          >
            {FORMAT_LABEL[doc.format] ?? doc.format}
          </span>
          <button
            onClick={() => onDelete(doc.id)}
            disabled={disabled}
            style={{
              background: 'none',
              border: '1px solid #fca5a5',
              color: '#ef4444',
              borderRadius: 4,
              padding: '0.2rem 0.5rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
            }}
          >
            삭제
          </button>
        </li>
      ))}
    </ul>
  )
}
