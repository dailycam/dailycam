import {
  LayoutDashboard,
  MonitorPlay,
  TrendingUp,
  Shield,
  Film,
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  Video,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navigation = [
  { name: '홈', icon: Home, href: '/home' },
  { name: '대시보드', icon: LayoutDashboard, href: '/dashboard' },
  { name: '모니터링', icon: MonitorPlay, href: '/monitoring' },
  { name: '발달 리포트', icon: TrendingUp, href: '/development-report' },
  { name: '안전 리포트', icon: Shield, href: '/safety-report' },
  { name: '클립 하이라이트', icon: Film, href: '/clip-highlights' },
  { name: '비디오 분석', icon: Video, href: '/video-analysis-test' },
  { name: '설정', icon: Settings, href: '/settings' },
]

interface SidebarProps {
  isCollapsed: boolean
  toggleSidebar: () => void
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const location = useLocation()
  const { user, isSubscribed, refreshUser } = useAuth()
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      const subscribed = Boolean(user.is_subscribed)
      setPlan(user.subscription_plan ?? null)

      if (subscribed && user.next_billing_at) {
        const now = new Date()
        const nextDate = new Date(user.next_billing_at)
        if (!isNaN(nextDate.getTime())) {
          const diffMs = nextDate.getTime() - now.getTime()
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          setDaysLeft(diffDays)
        } else {
          setDaysLeft(null)
        }
      } else {
        setDaysLeft(null)
      }
    }
  }, [user])

  // 구독 변경 이벤트 리스너
  useEffect(() => {
    const handleSubscriptionChanged = () => {
      refreshUser()
    }

    window.addEventListener('subscriptionChanged', handleSubscriptionChanged)
    return () => {
      window.removeEventListener('subscriptionChanged', handleSubscriptionChanged)
    }
  }, [refreshUser])

  const progressWidth =
    daysLeft !== null && daysLeft > 0 ? `${Math.min((daysLeft / 30) * 100, 100)}%` : '0%'
  const planLabel =
    plan === 'BASIC'
      ? '베이직 플랜'
      : plan === 'PREMIUM'
        ? '프리미엄 플랜'
        : '플랜 정보'

  return (
    <div
      className={`relative h-full transition-all duration-300 ${isCollapsed ? 'w-0' : 'w-64'
        }`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`absolute top-1/2 z-50 w-8 h-16 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all duration-300 shadow-md ${isCollapsed ? '-right-8' : '-right-4'
          }`}
        aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Content Wrapper */}
      <div className="h-full overflow-hidden bg-white border-r border-gray-200 flex flex-col">
        <div className="w-64 flex flex-col h-full">
          {/* Logo */}
          <Link
            to="/"
            className="h-16 flex items-center border-b border-gray-200 px-6"
          >
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Daily-cam 로고"
                className="w-10 h-10 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">👶</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Daily-cam</h1>
                <p className="text-xs text-gray-500">아이 곁에</p>
              </div>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  title={item.name}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Subscription Info */}
          <div className="p-2 border-t border-gray-200">
            {isSubscribed ? (
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-primary-700">
                    {planLabel}
                  </span>
                  <span className="text-xs text-gray-600">
                    {daysLeft !== null ? `${daysLeft}일 남음` : ''}
                  </span>
                </div>
                <div className="w-full bg-white rounded-full h-2 mb-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full"
                    style={{ width: progressWidth }}
                  />
                </div>
                <Link
                  to="/subscription"
                  className="block text-center text-xs text-primary-700 font-medium hover:text-primary-800"
                >
                  플랜 관리 →
                </Link>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-2">
                  프리미엄 기능을 이용하려면
                </p>
                <Link
                  to="/subscription"
                  className="block text-center text-xs bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700"
                >
                  구독하기
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
