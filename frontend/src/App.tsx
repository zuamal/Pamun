import { type ReactNode } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { useGraphStore } from './stores/graphStore'
import AppShell from './components/AppShell'
import UploadPage from './pages/UploadPage'
import ReviewPage from './pages/ReviewPage'
import GraphPage from './pages/GraphPage'

interface ProtectedRouteProps {
  check: () => boolean
  children: ReactNode
}

function ProtectedRoute({ check, children }: ProtectedRouteProps) {
  return check() ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  const { requirements } = useGraphStore()
  const hasRequirements = requirements.length > 0

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route
          path="/review"
          element={
            <ProtectedRoute check={() => hasRequirements}>
              <ReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/graph"
          element={
            <ProtectedRoute check={() => hasRequirements}>
              <GraphPage />
            </ProtectedRoute>
          }
        />
        {/* F17: /impact → /graph 리디렉션 (F11 라우트 대체) */}
        <Route path="/impact" element={<Navigate to="/graph" replace />} />
      </Routes>
    </AppShell>
  )
}
