import { Navigate } from 'react-router-dom'

// F17: ImpactPage가 GraphPage로 통합됨. /impact → /graph 리디렉션.
export default function ImpactPage() {
  return <Navigate to="/graph" replace />
}
