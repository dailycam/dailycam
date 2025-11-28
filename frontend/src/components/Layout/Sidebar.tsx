// frontend/src/components/Sidebar.tsx

import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MonitorPlay,
  TrendingUp,
  Shield,
  Film,
  Settings,
  TestTube,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '모니터링', href: '/monitoring', icon: MonitorPlay },
  { name: '발달 리포트', href: '/development-report', icon: TrendingUp },
  { name: '안전 리포트', href: '/safety-report', icon: Shield },
  { name: '클립 하이라이트', href: '/clip-highlights', icon: Film },
  { name: 'AI 분석 테스트', href: '/video-analysis-test', icon: TestTube },
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

export default function Sidebar() {
  const navigate = useNavigate()

  const [isSubscribed, setIsSubscribed] = useState(false)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) return

      try {
        const response = await fetch('http://localhost:8000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data: MeResponse = await response.json()
          console.log('ME DATA:', data)

          // 0/1 이든 true/false든 전부 boolean으로 정리
          const subscribed = Boolean(data.is_subscribed)
          setIsSubscribed(subscribed)

          // 플랜 코드 저장 (BASIC, PREMIUM 등)
          setPlan(data.subscription_plan ?? null)

          if (subscribed && data.next_billing_at) {
            const now = new Date()
            const nextDate = new Date(data.next_billing_at)

            if (!isNaN(nextDate.getTime())) {
              const diffMs = nextDate.getTime() - now.getTime()
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
              setDaysLeft(diffDays)
            } else {
              console.warn('next_billing_at 파싱 실패:', data.next_billing_at)
              setDaysLeft(null)
            }
          } else {
            setDaysLeft(null)
          }
        } else {
          console.error('GET /me 실패', await response.text())
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error)
      }
    }

    fetchUserInfo()

    const handleSubscriptionChange = () => {
      fetchUserInfo()
    }

    window.addEventListener('subscriptionChanged', handleSubscriptionChange)

    return () => {
      window.removeEventListener('subscriptionChanged', handleSubscriptionChange)
    }
  }, [])

  const progressWidth =
    daysLeft !== null && daysLeft > 0
      ? `${Math.min((daysLeft / 30) * 100, 100)}%`
      : '0%'

  // 플랜 코드 → 한글 라벨
  const planLabel =
    plan === 'BASIC'
      ? '베이직 플랜'
      : plan === 'PREMIUM'
        ? '프리미엄 플랜'
        : '플랜 정보'

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <Link to="/" className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Daily-cam 로고"
            className="w-10 h-10"
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
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Subscription Info */}
      <div className="p-4 border-t border-gray-200">
        {isSubscribed ? (
          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary-700">{planLabel}</span>
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
                  state: { section: 'subscription' }, // 🔥 구독 관리 탭으로 가자
                })
              } // 구독 관리 화면으로 이동
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
  )
}
