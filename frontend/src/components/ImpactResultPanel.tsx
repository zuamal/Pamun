import type { components } from '../api/types.generated'
import ImpactItem from './ImpactItem'

type ImpactResult = components['schemas']['ImpactResult']
type ImpactItemData = components['schemas']['ImpactItem']

interface ImpactResultPanelProps {
  result: ImpactResult
  selectedItemId: string | null
  onItemClick: (item: ImpactItemData) => void
}

export default function ImpactResultPanel({
  result,
  selectedItemId,
  onItemClick,
}: ImpactResultPanelProps) {
  const { affected_items, review_items } = result

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Affected section */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ef4444',
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#dc2626' }}>
            영향받음 (Affected)
          </span>
          <span
            style={{
              fontSize: 12,
              padding: '1px 8px',
              borderRadius: 10,
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
            }}
          >
            {affected_items.length}개
          </span>
        </div>

        {affected_items.length === 0 ? (
          <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>
            영향받는 요구사항 없음
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {affected_items.map((item) => (
              <ImpactItem
                key={item.requirement_id}
                item={item}
                selected={selectedItemId === item.requirement_id}
                onClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Review recommended section */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#f59e0b',
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#b45309' }}>
            검토 권장 (Review Recommended)
          </span>
          <span
            style={{
              fontSize: 12,
              padding: '1px 8px',
              borderRadius: 10,
              background: '#fffbeb',
              color: '#92400e',
              border: '1px solid #fde68a',
            }}
          >
            {review_items.length}개
          </span>
        </div>

        {review_items.length === 0 ? (
          <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>
            검토 권장 요구사항 없음
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {review_items.map((item) => (
              <ImpactItem
                key={item.requirement_id}
                item={item}
                selected={selectedItemId === item.requirement_id}
                onClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
