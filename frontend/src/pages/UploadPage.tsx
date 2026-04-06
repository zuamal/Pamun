import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteDocument, uploadDocuments } from '../api/documents'
import { parseDocumentsSSE, listRequirements } from '../api/requirements'
import DocumentList from '../components/DocumentList'
import FileDropzone from '../components/FileDropzone'
import ProgressModal from '../components/ProgressModal'
import { useDocumentStore } from '../stores/documentStore'
import { useGraphStore } from '../stores/graphStore'
import { toastError } from '../lib/toast'
import type { ProgressEvent } from '../api/sseTypes'

export default function UploadPage() {
  const navigate = useNavigate()
  const { documents, setDocuments } = useDocumentStore()
  const { setRequirements } = useGraphStore()
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')

  async function handleFiles(files: File[]) {
    setUploading(true)
    try {
      const uploaded = await uploadDocuments(files)
      setDocuments([...documents, ...uploaded])
    } catch (e) {
      toastError(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id)
      setDocuments(documents.filter((d) => d.id !== id))
    } catch (e) {
      toastError(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  async function handleParse() {
    if (documents.length === 0) return
    setParsing(true)
    setProgress(0)
    setProgressMsg('파싱 준비 중...')

    try {
      await parseDocumentsSSE(
        { document_ids: documents.map((d) => d.id) },
        (event: ProgressEvent) => {
          setProgress(event.progress)
          setProgressMsg(event.message)
          if (event.step === 'error') {
            throw new Error(event.message)
          }
        },
      )
      const reqs = await listRequirements()
      setRequirements(reqs)
      navigate('/review')
    } catch (e) {
      toastError(e instanceof Error ? e.message : '파싱 실패')
    } finally {
      setParsing(false)
    }
  }

  const busy = uploading || parsing

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">문서 업로드</h2>
        <FileDropzone onFiles={handleFiles} disabled={busy} />
        {uploading && (
          <p className="text-blue-500 mt-2 text-sm">업로드 중…</p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">
          업로드된 문서 ({documents.length})
        </h2>
        <DocumentList documents={documents} onDelete={handleDelete} disabled={busy} />
      </section>

      <button
        onClick={() => void handleParse()}
        disabled={busy || documents.length === 0}
        className="px-6 py-2.5 rounded-lg border-none bg-blue-500 text-white font-bold text-base cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
      >
        파싱 시작
      </button>

      {parsing && <ProgressModal message={progressMsg} progress={progress} />}
    </div>
  )
}
