import { type ReactNode } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { useGraphStore } from './stores/graphStore'
import AppShell from './components/AppShell'
import UploadPage from './pages/UploadPage'
import ReviewPage from './pages/ReviewPage'
import GraphPage from './pages/GraphPage'
import ImpactPage from './pages/ImpactPage'

interface ProtectedRouteProps {
  check: () => boolean
  children: ReactNode
}

function ProtectedRoute({ check, children }: ProtectedRouteProps) {
  return check() ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  const { requirements, edges } = useGraphStore()
  const hasRequirements = requirements.length > 0
  const hasApprovedEdges = edges.some((e) => e.status === 'approved')

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
        <Route
          path="/impact"
          element={
            <ProtectedRoute check={() => hasApprovedEdges}>
              <ImpactPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AppShell>
  )
}
