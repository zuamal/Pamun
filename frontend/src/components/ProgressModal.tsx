interface ProgressModalProps {
  message: string
  progress: number
}

export default function ProgressModal({ message, progress }: ProgressModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[2000]">
      <div className="bg-white rounded-2xl px-9 py-8 w-[440px] shadow-2xl">
        <div className="font-bold text-base text-slate-900 mb-5">처리 중...</div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3.5">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-[width] duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress text + message */}
        <div className="flex justify-between items-center">
          <div className="text-[13px] text-slate-600 flex-1 mr-3">{message}</div>
          <div className="text-[13px] font-bold text-indigo-500 shrink-0">{progress}%</div>
        </div>

        <div className="mt-3 text-[11px] text-slate-400">
          LLM 처리 중입니다. 최대 120초가 소요될 수 있습니다.
        </div>
      </div>
    </div>
  )
}
