interface ProgressModalProps {
  message: string
  progress: number
}

export default function ProgressModal({ message, progress }: ProgressModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: '32px 36px',
          width: 440,
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 20 }}>
          처리 중...
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 8,
            background: '#e2e8f0',
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Progress text + message */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#475569', flex: 1, marginRight: 12 }}>
            {message}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
            {progress}%
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
          LLM 처리 중입니다. 최대 120초가 소요될 수 있습니다.
        </div>
      </div>
    </div>
  )
}
