import { Routes, Route } from 'react-router-dom'
import HomeLayout from './components/Layout/HomeLayout'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import CameraSetup from './pages/CameraSetup'
import LiveMonitoring from './pages/LiveMonitoring'
import DailyReport from './pages/DailyReport'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

function App() {
  return (
    <Routes>
      {/* 홈 (랜딩 페이지) */}
      <Route path="/" element={<HomeLayout />}>
        <Route index element={<Home />} />
      </Route>

      {/* 앱 (대시보드 및 기능들) */}
      <Route element={<Layout />}>
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
