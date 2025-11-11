import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import CameraSetup from './pages/CameraSetup'
import LiveMonitoring from './pages/LiveMonitoring'
import DailyReport from './pages/DailyReport'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="camera-setup" element={<CameraSetup />} />
        <Route path="live-monitoring" element={<LiveMonitoring />} />
        <Route path="daily-report" element={<DailyReport />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
