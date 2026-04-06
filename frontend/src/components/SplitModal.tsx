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

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-[90%] max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 mb-4 font-bold text-base">요구사항 분리</h3>

        <p className="text-sm text-slate-500 m-0 mb-3">
          분리 위치(offset): 0 ~ {text.length} 사이 값 입력
        </p>

        <input
          type="range"
          min={0}
          max={text.length}
          value={clampedOffset}
          onChange={(e) => setOffset(Number(e.target.value))}
          className="w-full mb-2"
        />
        <input
          type="number"
          min={0}
          max={text.length}
          value={clampedOffset}
          onChange={(e) => setOffset(Number(e.target.value))}
          className="w-20 mb-4 border border-slate-200 rounded px-2 py-1 text-sm"
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-slate-500 m-0 mb-1">파트 1</p>
            <pre className="bg-slate-100 rounded-md p-2 text-xs whitespace-pre-wrap break-words m-0 min-h-12">
              {part1 || <span className="text-slate-400">(비어 있음)</span>}
            </pre>
          </div>
          <div>
            <p className="text-xs text-slate-500 m-0 mb-1">파트 2</p>
            <pre className="bg-slate-100 rounded-md p-2 text-xs whitespace-pre-wrap break-words m-0 min-h-12">
              {part2 || <span className="text-slate-400">(비어 있음)</span>}
            </pre>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-slate-300 bg-white cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (clampedOffset > 0 && clampedOffset < text.length) {
                onConfirm(requirement.id, clampedOffset)
              }
            }}
            disabled={clampedOffset <= 0 || clampedOffset >= text.length}
            className="px-4 py-1.5 rounded-md border-none bg-blue-500 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            분리 확인
          </button>
        </div>
      </div>
    </div>
  )
}
