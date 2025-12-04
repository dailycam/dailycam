import { Routes, Route } from 'react-router-dom'
import { AnalysisProvider } from './context/AnalysisContext'
import HomeLayout from './components/layout/HomeLayout'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import AppHome from './pages/AppHome'
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
import ProfileSetup from './pages/ProfileSetup'

function App() {
  return (
    <AnalysisProvider>
      <Routes>
        {/* 로그인 */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* 홈 (랜딩 페이지) */}
        <Route path="/" element={<HomeLayout />}>
          <Route index element={<Home />} />
        </Route>

        {/* 앱 (대시보드 및 기능들) */}
        <Route element={<AppLayout />}>
          {/* 미구독 사용자도 접근 가능 */}
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="settings" element={<Settings />} />

          {/* 보호된 라우트 - 구독 사용자만 접근 가능 */}
          <Route element={<ProtectedRoute />}>
            <Route path="home" element={<AppHome />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="monitoring" element={<Monitoring />} />
            <Route path="development-report" element={<DevelopmentReport />} />
            <Route path="safety-report" element={<SafetyReport />} />
            <Route path="clip-highlights" element={<ClipHighlights />} />
            <Route path="video-analysis-test" element={<VideoAnalysisTest />} />
          </Route>
        </Route>
      </Routes>
    </AnalysisProvider>
  )
}

export default App
