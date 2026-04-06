import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteDocument, uploadDocuments } from '../api/documents'
import { listBundles, loadBundle } from '../api/dummy'
import { parseDocumentsSSE, listRequirements } from '../api/requirements'
import DocumentList from '../components/DocumentList'
import FileDropzone from '../components/FileDropzone'
import ProgressModal from '../components/ProgressModal'
import EmptyState from '../components/EmptyState'
import { useDocumentStore } from '../stores/documentStore'
import { useGraphStore } from '../stores/graphStore'
import { toastError, toastSuccess } from '../lib/toast'
import type { ProgressEvent } from '../api/sseTypes'
import type { components } from '../api/types.generated'

type BundleInfo = components['schemas']['BundleInfo']

export default function UploadPage() {
  const navigate = useNavigate()
  const { documents, setDocuments } = useDocumentStore()
  const { setRequirements } = useGraphStore()
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')

  // Bundle loader state
  const [bundles, setBundles] = useState<BundleInfo[]>([])
  const [showBundleMenu, setShowBundleMenu] = useState(false)
  const [loadingBundle, setLoadingBundle] = useState(false)
  const [confirmBundle, setConfirmBundle] = useState<BundleInfo | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listBundles().then(setBundles).catch(() => {})
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!showBundleMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowBundleMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showBundleMenu])

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

  async function handleLoadBundle(bundle: BundleInfo) {
    setConfirmBundle(null)
    setLoadingBundle(true)
    try {
      const docs = await loadBundle(bundle.name)
      setDocuments(docs)
      toastSuccess(`${bundle.name} 번들을 불러왔습니다`)
    } catch (e) {
      toastError(e instanceof Error ? e.message : '번들 적재 실패')
    } finally {
      setLoadingBundle(false)
    }
  }

  const busy = uploading || parsing || loadingBundle

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="max-w-2xl mx-auto py-8 px-4">
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">문서 업로드</h2>
          {/* Sample bundle loader */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowBundleMenu((v) => !v)}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingBundle ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <span>📦</span>
              )}
              샘플 불러오기
            </button>

            {showBundleMenu && !loadingBundle && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {bundles.map((bundle) => (
                  <button
                    key={bundle.name}
                    onClick={() => {
                      setShowBundleMenu(false)
                      setConfirmBundle(bundle)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors"
                  >
                    <p className="font-semibold text-slate-800 text-sm">{bundle.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{bundle.files.join(', ')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <FileDropzone onFiles={handleFiles} disabled={busy} />
        {uploading && (
          <p className="text-blue-500 mt-2 text-sm">업로드 중…</p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3 text-slate-700">
          업로드된 문서
          {documents.length > 0 && (
            <span className="ml-2 text-xs font-normal bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
              {documents.length}
            </span>
          )}
        </h2>
        {documents.length === 0 ? (
          <EmptyState
            icon="📭"
            title="업로드된 문서가 없습니다"
            description="위 드롭존에서 .md / .docx / .pdf 파일을 선택하세요"
          />
        ) : (
          <DocumentList documents={documents} onDelete={handleDelete} disabled={busy} />
        )}
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

    {/* Confirm dialog */}
    {confirmBundle && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
          <h3 className="font-bold text-slate-900 text-base mb-2">{confirmBundle.name} 번들 불러오기</h3>
          <p className="text-sm text-slate-500 mb-5">
            현재 작업이 초기화됩니다. 계속하시겠습니까?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmBundle(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer border-none transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => void handleLoadBundle(confirmBundle)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 cursor-pointer border-none transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
