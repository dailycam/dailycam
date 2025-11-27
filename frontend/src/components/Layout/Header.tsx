import { Bell, User, LogOut, ChevronDown, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

interface UserInfo {
  id: number
  email: string
  name: string
  picture: string
  created_at: string
  is_subscribed?: boolean | number
  subscription_plan?: string | null
}

interface HeaderProps {
  isSidebarOpen: boolean
}

export default function Header({ isSidebarOpen }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const navigate = useNavigate()

  // 플랜 코드 → 표시용 문구
  const getPlanLabel = (info: UserInfo | null) => {
    if (!info) return '로딩 중...'

    const subscribed = Boolean(info.is_subscribed)

    if (!subscribed) return '무료 회원'

    switch (info.subscription_plan) {
      case 'BASIC':
        return '베이직 플랜 회원'
      case 'PREMIUM':
        return '프리미엄 플랜 회원'
      default:
        return '구독 회원'
    }
  }

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem('access_token')

      if (!token) {
        navigate('/login')
        return
      }

      try {
        const response = await fetch('http://localhost:8000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setUserInfo({
            ...data,
            is_subscribed: Boolean(data.is_subscribed),
          })
        } else {
          localStorage.removeItem('access_token')
          navigate('/login')
        }
      } catch (error) {
        console.error('사용자 정보 가져오기 오류:', error)
      }
    }

    fetchUserInfo()
  }, [navigate])

  const handleLogout = async () => {
    const token = localStorage.getItem('access_token')

    if (token) {
      try {
        await fetch('http://localhost:8000/api/auth/logout-with-token', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (error) {
        console.error('로그아웃 오류:', error)
      }
    }

    localStorage.removeItem('access_token')
    navigate('/')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        {!isSidebarOpen && (
          <Link to="/" className="flex items-center gap-3">
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
          </Link>
        )}
      </div>

      {/* Right Section (Notifications and User Profile) */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
        </button>

        {/* User Profile with Dropdown */}
        <div className="relative pl-4 border-l border-gray-200">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {userInfo?.name || '로딩 중...'}
              </p>
              <p className="text-xs text-gray-500">{getPlanLabel(userInfo)}</p>
            </div>
            {userInfo?.picture ? (
              <img
                src={userInfo.picture}
                alt={userInfo.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white">
                <User className="w-5 h-5" />
              </div>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''
                }`}
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
