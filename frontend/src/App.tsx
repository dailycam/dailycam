import { Routes, Route } from 'react-router-dom'
import HomeLayout from './components/Layout/HomeLayout'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ClipHighlights from './pages/ClipHighlights'
import LiveMonitoring from './pages/LiveMonitoring'
import DevelopmentReport from './pages/DevelopmentReport'
import SafetyReport from './pages/SafetyReport'
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
        <Route path="live-monitoring" element={<LiveMonitoring />} />
        <Route path="development-report" element={<DevelopmentReport />} />
        <Route path="safety-report" element={<SafetyReport />} />
        <Route path="clip-highlights" element={<ClipHighlights />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
