import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  User as UserIcon,
  Bell,
  Shield,
  CreditCard,
  Camera,
  Smartphone,
  Mail,
  Lock,
  Globe,
  Save,
  LogOut,
} from 'lucide-react'

interface UserInfo {
  id: number
  email: string
  name: string
  picture: string
  created_at: string
  is_subscribed: boolean | number
  next_billing_at?: string | null
  subscription_plan?: string | null
  has_billing_key?: boolean
}

type Section =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'camera'
  | 'subscription'
  | 'locale'

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()

  // Sidebar에서 navigate('/settings', { state: { section: 'subscription' } }) 로 오면
  // 기본 탭을 'subscription'으로 열어줌
  const initialSection: Section =
    ((location.state as { section?: Section } | null)?.section) ?? 'profile'

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [activeSection, setActiveSection] = useState<Section>(initialSection)
  const [isCancelling, setIsCancelling] = useState(false)

  const [notifications, setNotifications] = useState({
    danger: true,
    warning: true,
    info: false,
    email: true,
    push: true,
  })

  useEffect(() => {
    const sectionFromState =
      (location.state as { section?: Section } | null)?.section
    if (sectionFromState && sectionFromState !== activeSection) {
      setActiveSection(sectionFromState)
    }
  }, [location.state, activeSection])


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
            has_billing_key: Boolean(data.has_billing_key),
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

  const handleCancelSubscription = async () => {
    if (!userInfo) return

    if (!window.confirm('정말 구독을 해지하시겠어요? 다음 결제일부터 서비스 이용이 중단됩니다.')) {
      return
    }

    try {
      setIsCancelling(true)
      const token = localStorage.getItem('access_token')
      const res = await fetch('http://localhost:8000/api/payments/subscribe/basic/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('cancel error:', err)
        alert('구독 해지 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        return
      }

      const data = await res.json().catch(() => null)

      // ✅ 구독 정보(플랜, 남은 기간)는 그대로 두고,
      //    필요하면 안내 텍스트만 바꾸는 용도로 쓸 수 있음
      setUserInfo((prev) =>
        prev
          ? {
            ...prev,
            // 백엔드에서 내려주면 동기화
            is_subscribed: data?.is_subscribed ?? prev.is_subscribed,
            next_billing_at: data?.next_billing_at ?? prev.next_billing_at,
            subscription_plan: data?.subscription_plan ?? prev.subscription_plan,
            has_billing_key: data?.has_billing_key ?? false,
          }
          : prev
      )

      // 사이드바 등 다른 컴포넌트에 알려주기 (여전히 남은 기간은 보이게 됨)
      window.dispatchEvent(new Event('subscriptionChanged'))

      alert('구독 자동결제가 해지되었습니다. 남은 이용 기간 동안은 계속 사용 가능합니다.')
    } catch (e) {
      console.error(e)
      alert('구독 해지 중 오류가 발생했습니다.')
    } finally {
      setIsCancelling(false)
    }
  }


  const formatNextBillingDate = (iso?: string | null) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '-'
    // 예: 2025.12.11
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-600 mt-1">계정 및 서비스 설정을 관리하세요</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="card">
          <nav className="space-y-1">
            <SettingsNavItem
              icon={UserIcon}
              label="프로필"
              active={activeSection === 'profile'}
              onClick={() => setActiveSection('profile')}
            />
            <SettingsNavItem
              icon={Bell}
              label="알림"
              active={activeSection === 'notifications'}
              onClick={() => setActiveSection('notifications')}
            />
            <SettingsNavItem
              icon={Shield}
              label="보안 및 개인정보"
              active={activeSection === 'security'}
              onClick={() => setActiveSection('security')}
            />
            <SettingsNavItem
              icon={Camera}
              label="카메라 설정"
              active={activeSection === 'camera'}
              onClick={() => setActiveSection('camera')}
            />
            <SettingsNavItem
              icon={CreditCard}
              label="구독 관리"
              active={activeSection === 'subscription'}
              onClick={() => setActiveSection('subscription')}
            />
            <SettingsNavItem
              icon={Globe}
              label="언어 및 지역"
              active={activeSection === 'locale'}
              onClick={() => setActiveSection('locale')}
            />
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* 프로필 탭 */}
          {activeSection === 'profile' && (
            <>
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">프로필 정보</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    {userInfo?.picture ? (
                      <img
                        src={userInfo.picture}
                        alt={userInfo.name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {userInfo?.name?.charAt(0) || '김'}
                      </div>
                    )}
                    <div>
                      <button className="btn-secondary text-sm">사진 변경</button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG (최대 5MB)</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                    <input
                      type="text"
                      value={userInfo?.name || '로딩 중...'}
                      className="input-field"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input
                      type="email"
                      value={userInfo?.email || '로딩 중...'}
                      className="input-field"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
                    <input type="tel" defaultValue="010-1234-5678" className="input-field" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">자녀 정보</label>
                    <input type="text" defaultValue="아이 이름 (24개월)" className="input-field" />
                  </div>

                  <button className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    변경사항 저장
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 알림 탭 */}
          {activeSection === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">알림 설정</h2>
              <div className="space-y-4">
                <NotificationToggle
                  icon={Bell}
                  label="위험 알림 (높음)"
                  description="즉각적인 대응이 필요한 위험 상황"
                  checked={notifications.danger}
                  onChange={(checked) => setNotifications({ ...notifications, danger: checked })}
                />
                <NotificationToggle
                  icon={Bell}
                  label="주의 알림 (중간)"
                  description="주의가 필요한 상황"
                  checked={notifications.warning}
                  onChange={(checked) =>
                    setNotifications({ ...notifications, warning: checked })
                  }
                />
                <NotificationToggle
                  icon={Bell}
                  label="정보 알림 (낮음)"
                  description="일반적인 활동 정보"
                  checked={notifications.info}
                  onChange={(checked) => setNotifications({ ...notifications, info: checked })}
                />

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">알림 방식</h3>
                  <NotificationToggle
                    icon={Mail}
                    label="이메일 알림"
                    description="이메일로 알림 받기"
                    checked={notifications.email}
                    onChange={(checked) =>
                      setNotifications({ ...notifications, email: checked })
                    }
                  />
                  <NotificationToggle
                    icon={Smartphone}
                    label="푸시 알림"
                    description="모바일 앱 푸시 알림"
                    checked={notifications.push}
                    onChange={(checked) =>
                      setNotifications({ ...notifications, push: checked })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* 보안 탭 */}
          {activeSection === 'security' && (
            <>
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">보안 설정</h2>
                <div className="space-y-3">
                  <SecurityItem
                    icon={Lock}
                    label="비밀번호 변경"
                    description="마지막 변경: 30일 전"
                    action="변경"
                  />
                  <SecurityItem
                    icon={Shield}
                    label="2단계 인증"
                    description="추가 보안 계층 활성화"
                    action="설정"
                  />
                  <SecurityItem
                    icon={Smartphone}
                    label="로그인 기기 관리"
                    description="3개 기기에서 로그인 중"
                    action="관리"
                  />
                </div>
              </div>

              {/* Danger Zone */}
              <div className="card border-danger-200 bg-danger-50">
                <h2 className="text-lg font-semibold text-danger-900 mb-4">위험 영역</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">계정 로그아웃</p>
                      <p className="text-xs text-gray-600">모든 기기에서 로그아웃</p>
                    </div>
                    <button className="text-sm text-danger font-medium hover:text-danger-dark flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">계정 삭제</p>
                      <p className="text-xs text-gray-600">모든 데이터가 영구 삭제됩니다</p>
                    </div>
                    <button className="text-sm text-danger font-medium hover:text-danger-dark">
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 카메라 설정 / 언어 탭 */}
          {activeSection === 'camera' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">카메라 설정</h2>
              <p className="text-sm text-gray-600">카메라 설정 기능은 추후 추가될 예정입니다.</p>
            </div>
          )}

          {activeSection === 'locale' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">언어 및 지역</h2>
              <p className="text-sm text-gray-600">언어 및 지역 설정 기능은 추후 추가될 예정입니다.</p>
            </div>
          )}

          {/* 🔥 구독 관리 탭 */}
          {activeSection === 'subscription' && (
            <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">구독 관리</h2>
                  {userInfo?.is_subscribed ? (
                    userInfo.has_billing_key ? (
                      // ✅ 자동결제 ON
                      <p className="text-sm text-gray-600">
                        베이직 플랜 · 월 9,900원 · 다음 결제일:{' '}
                        {formatNextBillingDate(userInfo.next_billing_at)}
                      </p>
                    ) : (
                      // ✅ 자동결제 OFF (이번 달까지만 사용)
                      <p className="text-sm text-gray-600">
                        베이직 플랜 · 월 9,900원 · 자동결제 해지됨 · 이용 가능 ~{' '}
                        {formatNextBillingDate(userInfo.next_billing_at)}
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-gray-600">
                      현재 구독 중인 플랜이 없습니다. 베이직 플랜을 구독하고 AI 분석 기능을 사용해
                      보세요.
                    </p>
                  )}
                </div>

                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${userInfo?.is_subscribed
                    ? userInfo.has_billing_key
                      ? 'bg-primary-600 text-white' // 활성
                      : 'bg-amber-500 text-white'   // 만료 예정
                    : 'bg-gray-300 text-gray-700'   // 미사용
                    }`}
                >
                  {userInfo?.is_subscribed
                    ? userInfo.has_billing_key
                      ? '활성'
                      : '만료 예정'
                    : '미사용'}
                </span>
              </div>

              {userInfo?.is_subscribed ? (
                <>
                  <div className="space-y-2 mb-4">
                    <FeatureItem text="1대의 카메라 실시간 AI 분석" />
                    <FeatureItem text="대시보드 · 발달 · 안전 리포트 전체 기능" />
                    <FeatureItem text="하이라이트 클립 자동 생성" />
                    <FeatureItem text="분석 데이터 30일 보관" />
                  </div>

                  <div className="flex gap-3">
                    <button className="btn-secondary flex-1" disabled>
                      플랜 변경 (준비중)
                    </button>

                    {userInfo.has_billing_key ? (
                      // 🔥 자동결제 ON → 해지 버튼
                      <button
                        className="btn-primary flex-1 bg-danger-500 hover:bg-danger-600 border-danger-500"
                        onClick={handleCancelSubscription}
                        disabled={isCancelling}
                      >
                        {isCancelling ? '해지 중...' : '구독 자동결제 해지'}
                      </button>
                    ) : (
                      // 🔥 자동결제 OFF → 다시 결제하러 가기
                      <Link
                        to="/subscription"
                        className="btn-primary flex-1 text-center flex items-center justify-center"
                      >
                        자동결제 다시 설정하기
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <Link
                    to="/subscription"
                    className="btn-primary flex-1 text-center flex items-center justify-center"
                  >
                    베이직 플랜 구독하러 가기
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Settings Nav Item Component
function SettingsNavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: any
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
        }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  )
}

// Notification Toggle Component
function NotificationToggle({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: any
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-gray-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-300'
          }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        ></div>
      </button>
    </div>
  )
}

// Security Item Component
function SecurityItem({
  icon: Icon,
  label,
  description,
  action,
}: {
  icon: any
  label: string
  description: string
  action: string
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-600" />
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
      </div>
      <button className="text-sm text-primary-600 font-medium hover:text-primary-700">
        {action}
      </button>
    </div>
  )
}

// Feature Item Component
function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  )
}
