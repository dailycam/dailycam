import { Link } from 'react-router-dom'
import { useEffect, useState, type ComponentType } from 'react'
import { useEffect, useState, type ComponentType } from 'react'
import {
  Brain,
  Bell,
  BarChart3,
  CheckCircle,
  Star,
  TrendingUp,
  Clock,
  Smartphone,
  ArrowRight,
  AlertTriangle,
  Camera,
  LayoutDashboard,
  X,
  MonitorPlay,
  Shield,
  Film,
  Settings,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'
import IncidentPieChart from '../components/Charts/IncidentPieChart'
import { generateWeeklySafetyData } from '../utils/mockData'
import { SafetyBannerCarousel } from '../components/SafetyBannerCarousel'
import DashboardPage from './Dashboard'
import ClipHighlightsPage from './ClipHighlights'
import LiveMonitoringPage from './LiveMonitoring'
import DevelopmentReportPage from './DevelopmentReport'
import SafetyReportPage from './SafetyReport'
import SettingsPage from './Settings'

const features = [
  {
    name: '실시간 AI 분석',
    description: 'GPT-4 Vision을 활용한 실시간 영상 분석으로 아이의 안전을 지킵니다.',
    icon: Brain,
  },
  {
    name: '즉시 알림',
    description: '위험 상황 감지 시 즉시 푸시 알림을 받아 빠르게 대응할 수 있습니다.',
    icon: Bell,
  },
  {
    name: '기존 홈캠 활용',
    description: '새 카메라 구매 불필요! 기존 IP 카메라를 그대로 활용하세요.',
    icon: Camera,
  },
  {
    name: '안전도 분석',
    description: '일일/주간/월간 안전도 트렌드와 히트맵으로 패턴을 파악합니다.',
    icon: BarChart3,
  },
  {
    name: '24시간 모니터링',
    description: '언제 어디서나 스마트폰으로 아이의 상태를 확인할 수 있습니다.',
    icon: Clock,
  },
  {
    name: '모바일 앱',
    description: 'iOS/Android 앱으로 회사에서도 실시간으로 확인 가능합니다.',
    icon: Smartphone,
  },
]

const testimonials = [
  {
    name: '김지은',
    role: '워킹맘, 2세 아이 엄마',
    content:
      '회사에서도 아이가 안전한지 확인할 수 있어서 정말 마음이 놓입니다. AI가 위험한 상황을 바로 알려줘서 조부모님께도 안심하고 맡길 수 있어요.',
    rating: 5,
  },
  {
    name: '박준호',
    role: '워킹대디, 3세 쌍둥이 아빠',
    content:
      '기존에 사용하던 홈캠을 그대로 활용할 수 있어서 비용 부담이 없었어요. 쌍둥이를 키우면서 매일 리포트로 안전 체크하니 너무 편합니다.',
    rating: 5,
  },
  {
    name: '이서연',
    role: '신생아 엄마',
    content:
      '신생아 때는 SIDS가 걱정돼서 밤새 자주 확인했는데, 이제는 AI가 모니터링해주니 제대로 잠을 잘 수 있게 됐어요. 생명의 은인입니다!',
    rating: 5,
  },
]

const pricingPlans = [
  {
    name: '베이직',
    price: '9,900',
    description: '기본 모니터링 기능',
    features: [
      '1대 카메라 연동',
      '실시간 모니터링',
      'AI 위험 감지',
      '즉시 알림',
      '7일 데이터 보관',
    ],
  },
  {
    name: '프리미엄',
    price: '19,900',
    description: '전문가급 안전 관리',
    features: [
      '3대 카메라 연동',
      '실시간 모니터링',
      'AI 위험 감지 + 분석',
      '즉시 알림 + 일일 리포트',
      '30일 데이터 보관',
      '행동 패턴 분석',
      '우선 고객 지원',
    ],
    popular: true,
  },
  {
    name: '패밀리',
    price: '29,900',
    description: '가족 전체를 위한 플랜',
    features: [
      '무제한 카메라 연동',
      '실시간 모니터링',
      'AI 위험 감지 + 고급 분석',
      '즉시 알림 + 상세 리포트',
      '90일 데이터 보관',
      '행동 패턴 학습',
      '가족 공유 (5명)',
      'VIP 고객 지원',
    ],
  },
]

const stats = [
  { label: '누적 모니터링 시간', value: '100만+' },
  { label: '위험 감지 건수', value: '5,000+' },
  { label: '만족도', value: '98%' },
  { label: '활성 사용자', value: '2,500+' },
]

type PreviewKey = 'dashboard' | 'live' | 'development' | 'safety' | 'clips' | 'settings'

const previewNavItems: {
  id: PreviewKey
  label: string
  description: string
  icon: LucideIcon
  href: string
}[] = [
    { id: 'dashboard', label: '대시보드', description: '주요 안전 지표', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'live', label: '실시간 모니터링', description: '라이브 스트림', icon: MonitorPlay, href: '/live-monitoring' },
    { id: 'development', label: '발달 리포트', description: 'AI 발달 분석', icon: TrendingUp, href: '/development-report' },
    { id: 'safety', label: '안전 리포트', description: '안전도·트렌드', icon: Shield, href: '/safety-report' },
    { id: 'clips', label: '클립 하이라이트', description: '주요 순간 모음', icon: Film, href: '/clip-highlights' },
    { id: 'settings', label: '설정', description: '프로필·알림', icon: Settings, href: '/settings' },
  ]

const previewComponents: Record<PreviewKey, ComponentType> = {
  dashboard: DashboardPage,
  live: LiveMonitoringPage,
  development: DevelopmentReportPage,
  safety: SafetyReportPage,
  clips: ClipHighlightsPage,
  settings: SettingsPage,
}

export default function Home() {
  const weeklyData = generateWeeklySafetyData()

  const incidentData = [
    { name: '데드존 접근', value: 12, color: '#ef4444' },
    { name: '모서리 충돌', value: 8, color: '#f59e0b' },
    { name: '낙상 위험', value: 3, color: '#fb923c' },
    { name: '기타', value: 2, color: '#9ca3af' },
  ]

  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [activePreview, setActivePreview] = useState<PreviewKey>('dashboard')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDashboardOpen(false)
      }
    }

    if (isDashboardOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDashboardOpen])

  useEffect(() => {
    if (isDashboardOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setActivePreview('dashboard')
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isDashboardOpen])

  const openDashboardOverlay = () => setIsDashboardOpen(true)
  const closeDashboardOverlay = () => setIsDashboardOpen(false)
  const currentPreview = previewNavItems.find((item) => item.id === activePreview)
  const currentPreviewHref = currentPreview?.href ?? '/dashboard'
  const ActivePreviewComponent = previewComponents[activePreview]

  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [activePreview, setActivePreview] = useState<PreviewKey>('dashboard')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDashboardOpen(false)
      }
    }

    if (isDashboardOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDashboardOpen])

  useEffect(() => {
    if (isDashboardOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setActivePreview('dashboard')
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isDashboardOpen])

  const openDashboardOverlay = () => setIsDashboardOpen(true)
  const closeDashboardOverlay = () => setIsDashboardOpen(false)
  const currentPreview = previewNavItems.find((item) => item.id === activePreview)
  const currentPreviewHref = currentPreview?.href ?? '/dashboard'
  const ActivePreviewComponent = previewComponents[activePreview]

  return (
    <div className="bg-white">
      {/* Hero Section with Carousel */}
      <SafetyBannerCarousel />

      {/* Stats */}
      <section className="relative bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <dt className="text-sm font-medium leading-6 text-gray-600">
                  {stat.label}
                </dt>
                <dd className="mt-2 text-3xl font-bold tracking-tight text-primary-600">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">
              강력한 기능
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              AI가 만드는 안전한 육아 환경
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              최첨단 AI 기술로 아이의 안전을 24시간 지켜드립니다
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <feature.icon
                      className="h-5 w-5 flex-none text-primary-600"
                      aria-hidden="true"
                    />
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              실제 화면 미리보기
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              웹에서 바로 사용할 수 있는 강력한 기능들
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Safety Trend Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">주간 안전도 추이</h3>
                <TrendingUp className="w-6 h-6 text-safe" />
              </div>
              <div className="h-64">
                <SafetyTrendChart data={weeklyData} />
              </div>
            </div>

            {/* Incident Pie Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">위험 유형별 분포</h3>
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div className="h-64">
                <IncidentPieChart data={incidentData} />
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={openDashboardOverlay}
            <button
              type="button"
              onClick={openDashboardOverlay}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-500 transition-all"
            >
              대시보드 시작하기
              <ArrowRight className="w-5 h-5" />
            </button>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              합리적인 가격
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              새 AI 홈캠 구매 대비 최대 80% 절감
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col justify-between rounded-3xl bg-white p-8 shadow-lg ring-1 ring-gray-900/10 ${plan.popular ? 'ring-2 ring-primary-600 relative' : ''
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 mx-auto w-fit">
                    <span className="inline-flex items-center rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white">
                      가장 인기있는 플랜
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    {plan.description}
                  </p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">
                      ₩{plan.price}
                    </span>
                    <span className="text-sm font-semibold leading-6 text-gray-600">
                      /월
                    </span>
                  </p>
                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        <CheckCircle
                          className="h-6 w-5 flex-none text-primary-600"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={openDashboardOverlay}
                  className={`mt-8 w-full rounded-lg px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all ${plan.popular
                    ? 'bg-primary-600 text-white hover:bg-primary-500 focus-visible:outline-primary-600'
                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                    }`}
                >
                  시작하기
                </button>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              고객 후기
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              실제 사용자들의 생생한 경험을 들어보세요
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="flex flex-col justify-between bg-white rounded-2xl shadow-lg ring-1 ring-gray-900/10 p-8"
              >
                <div>
                  <div className="flex gap-x-1 text-primary-600">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    "{testimonial.content}"
                  </p>
                </div>
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              지금 시작하세요
              <br />
              14일 무료 체험
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-100">
              신용카드 등록 없이 바로 시작할 수 있습니다. 언제든지 취소 가능합니다.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                type="button"
                onClick={openDashboardOverlay}
              <button
                type="button"
                onClick={openDashboardOverlay}
                className="rounded-lg bg-white px-6 py-3 text-base font-semibold text-primary-600 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all"
              >
                무료 체험 시작하기
              </button>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Dashboard Icon */}
      <button
        type="button"
        onClick={openDashboardOverlay}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-primary-600 px-5 py-3 text-white shadow-xl hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-semibold">대시보드 미리보기</span>
      </button>

      {isDashboardOpen && ActivePreviewComponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-2 py-8 sm:px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDashboardOverlay} />
          <div className="relative z-10 flex w-full max-w-[1900px] max-h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-[32px] bg-gray-100 shadow-2xl ring-1 ring-black/5">
            <button
              type="button"
              onClick={closeDashboardOverlay}
              className="absolute top-4 right-4 z-10 rounded-full bg-white/80 p-2 shadow hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              aria-label="서비스 창 닫기"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex h-full overflow-hidden">
              {/* Sidebar */}
              <aside className="hidden w-64 flex-col bg-white border-r border-gray-200 lg:flex">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <img
                      src="/daily-cam (4).png"
                      alt="Daily-cam 로고"
                      className="w-10 h-10 rounded-xl border border-gray-100 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">Daily-cam</h1>
                      <p className="text-xs text-gray-500">아이 곁에</p>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1">
                  {previewNavItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePreview(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${activePreview === item.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  ))}
                </nav>
                <div className="p-4 border-t border-gray-200">
                  <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-primary-700">프리미엄 플랜</span>
                      <span className="text-xs text-gray-600">30일 남음</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 mb-2">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                    <button className="w-full text-xs text-primary-700 font-medium hover:text-primary-800">
                      플랜 관리 →
                    </button>
                  </div>
                </div>
              </aside>

              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile navigation */}
                <div className="border-b border-gray-200 bg-white px-3 py-3 flex gap-2 overflow-x-auto lg:hidden">
                  {previewNavItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePreview(item.id)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${activePreview === item.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
                  <div>
                    <p className="text-xs text-gray-500">현재 서비스</p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{currentPreview?.label}</h3>
                      <span className="text-xs font-medium text-gray-400">{currentPreview?.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      to={currentPreviewHref}
                      onClick={closeDashboardOverlay}
                      className="hidden rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-primary-500 hover:text-primary-600 sm:inline-flex"
                    >
                      전체 화면 이동
                    </Link>
                    <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
                    </button>
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">김부모님</p>
                        <p className="text-xs text-gray-500">프리미엄 회원</p>
                      </div>
                      <button className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white hover:shadow-lg transition-shadow">
                        <User className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-gray-50">
                  <div className="h-full w-full overflow-y-auto px-3 py-4 sm:px-8 sm:py-6">
                    <ActivePreviewComponent />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

