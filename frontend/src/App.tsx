import { Routes, Route } from 'react-router-dom'

function HomePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Pamun</h1>
      <p>Requirements Dependency Tracker &amp; Change Impact Analyzer</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}
