import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteDocument, listDocuments, uploadDocuments } from '../api/documents'
import { parseDocuments } from '../api/requirements'
import DocumentList from '../components/DocumentList'
import FileDropzone from '../components/FileDropzone'
import { useDocumentStore } from '../stores/documentStore'

export default function UploadPage() {
  const navigate = useNavigate()
  const { documents, setDocuments } = useDocumentStore()
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing documents on mount
  useEffect(() => {
    listDocuments()
      .then((res) => setDocuments(res.documents))
      .catch(() => {/* server may not be running */})
  }, [setDocuments])

  async function handleFiles(files: File[]) {
    setError(null)
    setUploading(true)
    try {
      const uploaded = await uploadDocuments(files)
      setDocuments([...documents, ...uploaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await deleteDocument(id)
      setDocuments(documents.filter((d) => d.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  async function handleParse() {
    if (documents.length === 0) return
    setError(null)
    setParsing(true)
    try {
      await parseDocuments({ document_ids: documents.map((d) => d.id) })
      navigate('/review')
    } catch (e) {
      setError(e instanceof Error ? e.message : '파싱 실패')
    } finally {
      setParsing(false)
    }
  }

  const busy = uploading || parsing

  return (
    <div style={{ maxWidth: 700, margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Pamun</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>기획 문서를 업로드하고 요구사항을 분석하세요.</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>문서 업로드</h2>
        <FileDropzone onFiles={handleFiles} disabled={busy} />
        {uploading && (
          <p style={{ color: '#3b82f6', marginTop: '0.5rem', fontSize: '0.875rem' }}>업로드 중…</p>
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
          업로드된 문서 ({documents.length})
        </h2>
        <DocumentList documents={documents} onDelete={handleDelete} disabled={busy} />
      </section>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6,
          padding: '0.75rem 1rem', color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleParse}
        disabled={busy || documents.length === 0}
        style={{
          padding: '0.65rem 1.5rem', borderRadius: 8, border: 'none',
          background: busy || documents.length === 0 ? '#cbd5e1' : '#3b82f6',
          color: '#fff', fontWeight: 700, fontSize: '1rem',
          cursor: busy || documents.length === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}
      >
        {parsing ? '파싱 중… (최대 120초)' : '파싱 시작'}
      </button>
    </div>
  )
}
