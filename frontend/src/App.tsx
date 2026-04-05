import { Routes, Route } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import ReviewPage from './pages/ReviewPage'
import GraphPage from './pages/GraphPage'
import ImpactPage from './pages/ImpactPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/review" element={<ReviewPage />} />
      <Route path="/graph" element={<GraphPage />} />
      <Route path="/impact" element={<ImpactPage />} />
    </Routes>
  )
}
