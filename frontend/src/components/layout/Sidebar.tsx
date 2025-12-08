import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MonitorPlay,
  TrendingUp,
  Shield,
  Film,
  Settings,
  ScanEye,
  Home,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getAuthToken } from '../../lib/auth'
import { API_BASE_URL } from '@/constants/api'

const navigation = [
  { name: '홈', href: '/home', icon: Home },
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '모니터링', href: '/monitoring', icon: MonitorPlay },
  { name: '발달 리포트', href: '/development-report', icon: TrendingUp },
  { name: '안전 리포트', href: '/safety-report', icon: Shield },
  { name: '클립 하이라이트', href: '/clip-highlights', icon: Film },
  { name: 'AI 행동 관찰', href: '/video-analysis-test', icon: ScanEye },
  { name: '설정', href: '/settings', icon: Settings },
]

type MeResponse = {
  id: number
  email: string
  name: string
  is_subscribed: boolean | number
  next_billing_at?: string | null
  subscription_plan?: string | null
}

interface SidebarProps {
  isCollapsed: boolean
  toggleSidebar: () => void
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const navigate = useNavigate()

  const [isSubscribed, setIsSubscribed] = useState(false)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = getAuthToken()
      if (!token) return

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data: MeResponse = await response.json()
          const subscribed = Boolean(data.is_subscribed)
          setIsSubscribed(subscribed)
          setPlan(data.subscription_plan ?? null)

          if (subscribed && data.next_billing_at) {
            const now = new Date()
            const nextDate = new Date(data.next_billing_at)
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
      } catch (error) {
        console.error('Failed to fetch user info:', error)
      }
    }

    fetchUserInfo()
    window.addEventListener('subscriptionChanged', fetchUserInfo)
    return () => {
      window.removeEventListener('subscriptionChanged', fetchUserInfo)
    }
  }, [])

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
          <nav className="flex-1 px-2 py-6 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            ))}
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
                <button
                  className="w-full text-xs text-primary-700 font-medium hover:text-primary-800"
                  onClick={() =>
                    navigate('/settings', {
                      state: { section: 'subscription' },
                    })
                  }
                >
                  플랜 관리 →
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  구독중인 플랜이 없습니다
                </p>
                <Link
                  to="/subscription"
                  className="block w-full py-2 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors text-center"
                >
                  구독하러 가기
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
