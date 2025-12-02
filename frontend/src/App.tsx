import { Routes, Route } from 'react-router-dom'
import { AnalysisProvider } from './context/AnalysisContext' // 추가
import HomeLayout from './components/Layout/HomeLayout'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import { Dashboard } from './pages/Dashboard'
import Monitoring from './pages/Monitoring'
import DevelopmentReport from './pages/DevelopmentReport'
import SafetyReport from './pages/SafetyReport'
import ClipHighlights from './pages/ClipHighlights'
import Settings from './pages/Settings'
import VideoAnalysisTest from './pages/VideoAnalysisTest'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import SubscriptionPage from './pages/SubscriptionPage'

function App() {
  return (
    <AnalysisProvider> {/* 추가 */}
      <Routes>
        {/* 로그인 */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* 홈 (랜딩 페이지) */}
        <Route path="/" element={<HomeLayout />}>
          <Route index element={<Home />} />
        </Route>

        {/* 앱 (대시보드 및 기능들) */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="development-report" element={<DevelopmentReport />} />
          <Route path="safety-report" element={<SafetyReport />} />
          <Route path="clip-highlights" element={<ClipHighlights />} />
          <Route path="video-analysis-test" element={<VideoAnalysisTest />} />
          <Route path="settings" element={<Settings />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
        </Route>
      </Routes>
    </AnalysisProvider> /* 추가 */
  )
}

export default App
