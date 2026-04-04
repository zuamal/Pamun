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
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 10, padding: '1.5rem',
          width: '90%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 1rem' }}>요구사항 분리</h3>

        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem' }}>
          분리 위치(offset): 0 ~ {text.length} 사이 값 입력
        </p>

        <input
          type="range"
          min={0}
          max={text.length}
          value={clampedOffset}
          onChange={(e) => setOffset(Number(e.target.value))}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <input
          type="number"
          min={0}
          max={text.length}
          value={clampedOffset}
          onChange={(e) => setOffset(Number(e.target.value))}
          style={{ width: '5rem', marginBottom: '1rem' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem' }}>파트 1</p>
            <pre style={{
              background: '#f1f5f9', borderRadius: 6, padding: '0.5rem',
              fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              margin: 0, minHeight: '3rem',
            }}>
              {part1 || <span style={{ color: '#94a3b8' }}>(비어 있음)</span>}
            </pre>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem' }}>파트 2</p>
            <pre style={{
              background: '#f1f5f9', borderRadius: 6, padding: '0.5rem',
              fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              margin: 0, minHeight: '3rem',
            }}>
              {part2 || <span style={{ color: '#94a3b8' }}>(비어 있음)</span>}
            </pre>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
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
            style={{
              padding: '0.4rem 1rem', borderRadius: 6, border: 'none',
              background: '#3b82f6', color: '#fff', cursor: 'pointer',
            }}
          >
            분리 확인
          </button>
        </div>
      </div>
    </div>
  )
}
