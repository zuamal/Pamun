import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']
type Edge = components['schemas']['Edge']

interface NodeDetailPanelProps {
  requirement: Requirement | null
  requirements: Requirement[]
  edges: Edge[]
  documents: Record<string, string> // id → filename
  onClose: () => void
  onDeleteEdge: (edgeId: string) => void
}

export default function NodeDetailPanel({
  requirement,
  requirements,
  edges,
  documents,
  onClose,
  onDeleteEdge,
}: NodeDetailPanelProps) {
  if (!requirement) return null

  const reqMap = Object.fromEntries(requirements.map((r) => [r.id, r]))

  const connectedEdges = edges.filter(
    (e) =>
      (e.source_id === requirement.id || e.target_id === requirement.id) &&
      e.status === 'approved',
  )

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 2 }}>
            {requirement.display_label}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{requirement.title}</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}
        >
          ×
        </button>
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>소속 문서</div>
        <div style={{ fontSize: 13, color: '#334155' }}>
          {documents[requirement.location.document_id] ?? requirement.location.document_id}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>원문</div>
        <div
          style={{
            fontSize: 12,
            color: '#475569',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '8px 10px',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {requirement.original_text}
        </div>
      </div>

      {connectedEdges.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>
            연결된 Edge ({connectedEdges.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {connectedEdges.map((edge) => {
              const other = edge.source_id === requirement.id
                ? reqMap[edge.target_id]
                : reqMap[edge.source_id]
              const direction = edge.source_id === requirement.id ? '→' : '←'
              return (
                <div
                  key={edge.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: '#3b82f6', fontWeight: 600 }}>
                      {direction} {other?.display_label ?? '?'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: edge.relation_type === 'depends_on' ? '#dbeafe' : '#ede9fe',
                          color: edge.relation_type === 'depends_on' ? '#1d4ed8' : '#6d28d9',
                        }}
                      >
                        {edge.relation_type}
                      </span>
                      <button
                        onClick={() => onDeleteEdge(edge.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: 0 }}
                        title="Edge 삭제"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {other && (
                    <div style={{ color: '#475569', marginBottom: 4 }}>{other.title}</div>
                  )}
                  {edge.evidence && (
                    <div style={{ color: '#64748b', fontStyle: 'italic' }}>"{edge.evidence}"</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {connectedEdges.length === 0 && (
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
          연결된 Edge 없음
        </div>
      )}
    </div>
  )
}
