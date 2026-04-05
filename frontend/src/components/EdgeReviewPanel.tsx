import type { components } from '../api/types.generated'

type Edge = components['schemas']['Edge']
type Requirement = components['schemas']['Requirement']

interface EdgeReviewPanelProps {
  pendingEdges: Edge[]
  requirements: Requirement[]
  onApprove: (edgeId: string) => void
  onReject: (edgeId: string) => void
}

export default function EdgeReviewPanel({
  pendingEdges,
  requirements,
  onApprove,
  onReject,
}: EdgeReviewPanelProps) {
  const reqMap = Object.fromEntries(requirements.map((r) => [r.id, r]))

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
        PENDING Edge 검토
        {pendingEdges.length > 0 && (
          <span
            style={{
              marginLeft: 8,
              background: '#fef3c7',
              color: '#92400e',
              borderRadius: 10,
              padding: '1px 8px',
              fontSize: 12,
            }}
          >
            {pendingEdges.length}
          </span>
        )}
      </div>

      {pendingEdges.length === 0 && (
        <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
          검토할 PENDING Edge가 없습니다
        </div>
      )}

      {pendingEdges.map((edge) => {
        const src = reqMap[edge.source_id]
        const tgt = reqMap[edge.target_id]
        const confidence = Math.round(edge.confidence * 100)
        return (
          <div
            key={edge.id}
            style={{
              border: '1px solid #fed7aa',
              borderRadius: 8,
              padding: '10px 12px',
              background: '#fffbf5',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {src?.display_label ?? edge.source_id}
              </span>
              <span style={{ color: '#64748b' }}>→</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {tgt?.display_label ?? edge.target_id}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: edge.relation_type === 'depends_on' ? '#dbeafe' : '#ede9fe',
                  color: edge.relation_type === 'depends_on' ? '#1d4ed8' : '#6d28d9',
                }}
              >
                {edge.relation_type}
              </span>
            </div>

            {src && (
              <div style={{ color: '#475569', marginBottom: 2 }}>
                <span style={{ fontWeight: 500 }}>{src.title}</span>
              </div>
            )}
            {tgt && (
              <div style={{ color: '#475569', marginBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>→ {tgt.title}</span>
              </div>
            )}

            {edge.evidence && (
              <div style={{ color: '#64748b', fontStyle: 'italic', marginBottom: 6 }}>
                "{edge.evidence}"
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>신뢰도 {confidence}%</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onApprove(edge.id)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 5,
                    border: 'none',
                    background: '#22c55e',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  승인
                </button>
                <button
                  onClick={() => onReject(edge.id)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 5,
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  거부
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
