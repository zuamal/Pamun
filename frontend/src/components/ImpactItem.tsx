import type { components } from '../api/types.generated'

type ImpactItemData = components['schemas']['ImpactItem']

interface ImpactItemProps {
  item: ImpactItemData
  onClick: (item: ImpactItemData) => void
  selected: boolean
}

export default function ImpactItem({ item, onClick, selected }: ImpactItemProps) {
  const isAffected = item.impact_level === 'affected'
  const accent = isAffected ? '#ef4444' : '#f59e0b'
  const bg = isAffected ? (selected ? '#fef2f2' : '#fff') : (selected ? '#fffbeb' : '#fff')
  const border = isAffected
    ? selected ? '#fca5a5' : '#fecaca'
    : selected ? '#fcd34d' : '#fde68a'

  return (
    <div
      onClick={() => onClick(item)}
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${border}`,
        background: bg,
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: selected ? `0 0 0 2px ${accent}33` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>
          {item.display_label}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8', flex: 1 }}>
          {item.document_filename}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 7px',
            borderRadius: 10,
            background: accent,
            color: '#fff',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {isAffected ? '영향받음' : '검토 권장'}
        </span>
      </div>
      <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, marginBottom: 4 }}>
        {item.requirement_title}
      </div>
      {item.evidence && (
        <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
          "{item.evidence}"
        </div>
      )}
    </div>
  )
}
