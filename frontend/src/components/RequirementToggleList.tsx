import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']

interface RequirementToggleListProps {
  requirements: Requirement[]
  documents: Record<string, string> // id → filename
  onToggle: (req: Requirement, changed: boolean) => void
}

export default function RequirementToggleList({
  requirements,
  documents,
  onToggle,
}: RequirementToggleListProps) {
  if (requirements.length === 0) {
    return (
      <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
        요구사항이 없습니다
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {requirements.map((req) => (
        <div
          key={req.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${req.changed ? '#fed7aa' : '#e2e8f0'}`,
            background: req.changed ? '#fffbf5' : '#fff',
            transition: 'all 0.15s',
          }}
        >
          <input
            type="checkbox"
            checked={req.changed ?? false}
            onChange={(e) => onToggle(req, e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#f97316', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>
                {req.display_label}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {documents[req.location.document_id] ?? req.location.document_id}
              </span>
              {req.changed && (
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 7px',
                    borderRadius: 10,
                    background: '#f97316',
                    color: '#fff',
                    fontWeight: 700,
                    marginLeft: 'auto',
                  }}
                >
                  변경 예정
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#334155',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {req.title}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
