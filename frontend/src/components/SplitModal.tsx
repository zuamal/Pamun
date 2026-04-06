import { useState } from 'react'
import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']

interface Props {
  requirement: Requirement | null
  onConfirm: (id: string, offset: number) => void
  onClose: () => void
}

export default function SplitModal({ requirement, onConfirm, onClose }: Props) {
  const [offset, setOffset] = useState(0)

  if (!requirement) return null

  const text = requirement.original_text
  const clampedOffset = Math.max(0, Math.min(offset, text.length))
  const part1 = text.slice(0, clampedOffset)
  const part2 = text.slice(clampedOffset)
  const canConfirm = clampedOffset > 0 && clampedOffset < text.length

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-[90%] max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h3 className="m-0 font-bold text-base text-slate-900">요구사항 분리</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none bg-transparent border-none cursor-pointer">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Offset control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">
                분리 위치 (offset)
              </label>
              <span className="text-xs text-slate-500">
                <input
                  type="number"
                  min={0}
                  max={text.length}
                  value={clampedOffset}
                  onChange={(e) => setOffset(Number(e.target.value))}
                  className="w-16 border border-slate-300 rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:border-blue-400"
                />
                <span className="ml-1 text-slate-400">/ {text.length}</span>
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={text.length}
              value={clampedOffset}
              onChange={(e) => setOffset(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Inline preview with cursor */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">원문 미리보기</div>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto m-0 font-mono text-slate-700">
              {part1}
              <span className="inline-block w-0.5 h-4 bg-blue-500 align-middle animate-pulse mx-px" />
              {part2}
            </pre>
          </div>

          {/* Split preview */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">
                파트 1
                <span className="ml-1.5 font-normal text-slate-400">({part1.length}자)</span>
              </div>
              <pre className="bg-slate-100 rounded-lg p-2.5 text-xs whitespace-pre-wrap break-words m-0 min-h-14 text-slate-700 leading-relaxed">
                {part1 || <span className="text-slate-400 italic">(비어 있음)</span>}
              </pre>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">
                파트 2
                <span className="ml-1.5 font-normal text-slate-400">({part2.length}자)</span>
              </div>
              <pre className="bg-slate-100 rounded-lg p-2.5 text-xs whitespace-pre-wrap break-words m-0 min-h-14 text-slate-700 leading-relaxed">
                {part2 || <span className="text-slate-400 italic">(비어 있음)</span>}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors text-sm"
          >
            취소
          </button>
          <button
            onClick={() => canConfirm && onConfirm(requirement.id, clampedOffset)}
            disabled={!canConfirm}
            className="px-4 py-2 rounded-lg border-none bg-blue-500 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors text-sm font-semibold"
          >
            분리 확인
          </button>
        </div>
      </div>
    </div>
  )
}
