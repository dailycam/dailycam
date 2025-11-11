import { Link } from 'react-router-dom'
import {
  Shield,
  Camera,
  Brain,
  Bell,
  BarChart3,
  CheckCircle,
  Star,
  TrendingUp,
  Clock,
  Smartphone,
  ArrowRight,
  Play,
  AlertTriangle,
  Activity,
  MapPin,
  Video,
  MonitorPlay,
} from 'lucide-react'
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'
import IncidentPieChart from '../components/Charts/IncidentPieChart'
import ActivityBarChart from '../components/Charts/ActivityBarChart'
import HourlyHeatmap from '../components/Charts/HourlyHeatmap'
import { generateWeeklySafetyData, generateHourlyActivityData } from '../utils/mockData'

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

export default function Home() {
  const weeklyData = generateWeeklySafetyData()
  const hourlyData = generateHourlyActivityData()
  
  const incidentData = [
    { name: '데드존 접근', value: 12, color: '#ef4444' },
    { name: '모서리 충돌', value: 8, color: '#f59e0b' },
    { name: '낙상 위험', value: 3, color: '#fb923c' },
    { name: '기타', value: 2, color: '#9ca3af' },
  ]
  
  const activityData = [
    { day: '월', activity: 85 },
    { day: '화', activity: 78 },
    { day: '수', activity: 92 },
    { day: '목', activity: 88 },
    { day: '금', activity: 95 },
    { day: '토', activity: 70 },
    { day: '일', activity: 65 },
  ]

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              아이의 안전,
              <br />
              <span className="text-primary-600">AI가 지켜드립니다</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              기존 홈캠을 AI 안전 모니터링 시스템으로 업그레이드하세요.
              <br />
              GPT-4 Vision이 실시간으로 위험을 감지하고 즉시 알려드립니다.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/dashboard"
                className="rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-all"
              >
                지금 시작하기
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 text-base font-semibold leading-6 text-gray-900 hover:text-primary-600 transition-colors"
              >
                더 알아보기
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="mt-16 flow-root sm:mt-24">
            <div className="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl lg:p-4">
              <div className="aspect-video rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">
                    서비스 소개 배너 이미지 영역
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    1200 x 675px 권장
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center bg-white/60 backdrop-blur rounded-2xl p-6"
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
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-500 transition-all"
            >
              대시보드 시작하기
              <ArrowRight className="w-5 h-5" />
            </Link>
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
                className={`flex flex-col justify-between rounded-3xl bg-white p-8 shadow-lg ring-1 ring-gray-900/10 ${
                  plan.popular ? 'ring-2 ring-primary-600 relative' : ''
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
                <Link
                  to="/dashboard"
                  className={`mt-8 block rounded-lg px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-500 focus-visible:outline-primary-600'
                      : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                  }`}
                >
                  시작하기
                </Link>
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
              <Link
                to="/dashboard"
                className="rounded-lg bg-white px-6 py-3 text-base font-semibold text-primary-600 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all"
              >
                무료 체험 시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

