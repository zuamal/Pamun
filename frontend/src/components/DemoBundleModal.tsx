import type { components } from '../api/types.generated'

type DemoBundleInfo = components['schemas']['DemoBundleInfo']

interface DemoBundleModalProps {
  bundles: DemoBundleInfo[]
  loading: boolean
  onSelect: (bundle: DemoBundleInfo) => void
  onClose: () => void
}

export default function DemoBundleModal({ bundles, loading, onSelect, onClose }: DemoBundleModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-base">데모 체험</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer border-none bg-transparent disabled:opacity-50"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          번들을 선택하면 파싱·추론이 완료된 세션을 즉시 불러옵니다.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="ml-3 text-sm text-slate-500">불러오는 중...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {bundles.map((bundle) => (
              <button
                key={bundle.name}
                onClick={() => onSelect(bundle)}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <p className="font-semibold text-slate-800 text-sm">{bundle.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {bundle.description} · {bundle.file_count}개 파일
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
