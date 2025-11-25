import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import CameraSetup from './pages/CameraSetup'

function App() {
  return (
    <Routes>
      {/* 비디오 분석 페이지만 */}
      <Route element={<Layout />}>
        <Route path="/" element={<CameraSetup />} />
        <Route path="camera-setup" element={<CameraSetup />} />
      </Route>
    </Routes>
  )
}

export default App
