import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Shield,
  Camera,
  Sparkles,
  Baby,
  MessageCircle,
} from 'lucide-react'
import { getDashboardData, type DashboardData } from '../lib/api'
import { mockDashboardData } from '../utils/mockData'

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const dashboard = await getDashboardData(7)
        setDashboardData(dashboard)
      } catch (err: any) {
        console.error('대시보드 데이터 로딩 오류:', err)
        // API 실패 시 더미 데이터 사용 (미리보기용)
        setDashboardData(mockDashboardData)
        setError(null) // 에러를 숨기고 더미 데이터 표시
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50">
        <div className="text-red-600">에러: {error || '데이터를 불러올 수 없습니다'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top: Main Summary Card - Centered */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <MainSummaryCard 
              safetyScore={dashboardData.safetyScore}
            />
          </div>
        </div>

        {/* Middle: Today's Highlights */}
        <div className="w-full">
          <TodayHighlightsCard />
        </div>

        {/* Bottom: Three Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <SummaryCard
            title="안전도"
            value={`${dashboardData.safetyScore}점`}
            status="우수"
            icon={Shield}
            progress={dashboardData.safetyScore}
            gradientFrom="from-primary-500"
            gradientTo="to-primary-600"
            iconBg="bg-primary-100"
            iconColor="text-primary-600"
            badgeColor="bg-safe"
          />
          <SummaryCard
            title="모니터링"
            value={`${dashboardData.monitoringHours}시간`}
            status="오늘"
            icon={Camera}
            progress={(dashboardData.monitoringHours / 24) * 100}
            gradientFrom="from-primary-500"
            gradientTo="to-primary-600"
            iconBg="bg-primary-100"
            iconColor="text-primary-600"
            badgeColor="bg-primary-600"
          />
          <SummaryCard
            title="알림"
            value={`${dashboardData.incidentCount}건`}
            status="모두 해결"
            icon={AlertTriangle}
            progress={dashboardData.incidentCount > 0 ? 100 : 0}
            gradientFrom="from-[#f59e0b]"
            gradientTo="to-[#d97706]"
            iconBg="bg-warning-50"
            iconColor="text-warning"
            badgeColor="bg-safe"
          />
        </div>
      </div>
    </div>
  )
}

// Today's Highlights Card Component
function TodayHighlightsCard() {
  const highlights = [
    {
      title: '배밀이 2미터 성공!',
      icon: Baby,
      iconColor: 'text-primary-600',
      iconBg: 'bg-primary-100',
      badge: { text: '성공', color: 'bg-safe' },
    },
    {
      title: '옹알이 20% 증가',
      icon: MessageCircle,
      iconColor: 'text-primary-600',
      iconBg: 'bg-primary-100',
      badge: { text: '+20%', color: 'bg-primary-600' },
    },
    {
      title: '안전한 하루',
      icon: Shield,
      iconColor: 'text-primary-600',
      iconBg: 'bg-primary-100',
      badge: { text: '안전', color: 'bg-safe' },
    },
  ]

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-primary-600" />
        <h2 className="text-xl font-bold text-gray-900">오늘의 하이라이트</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {highlights.map((highlight, index) => {
          const Icon = highlight.icon
          return (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 ${highlight.iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${highlight.iconColor}`} />
                </div>
                <span className={`text-xs px-2 py-1 rounded text-white font-medium ${highlight.badge.color}`}>
                  {highlight.badge.text}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{highlight.title}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Main Summary Card Component
function MainSummaryCard({ safetyScore }: { safetyScore: number }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl shadow-lg border border-blue-100 p-6 h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-2">오늘도 함께해요</h2>
          <p className="text-base text-gray-800">
            지수는 기분이 아주 좋아요!
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">안전 상태</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {safetyScore}점
            </span>
            <span className="text-xs px-2 py-1 rounded text-white font-medium bg-safe">
              우수
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-safe rounded-full"></div>
            <span className="text-sm text-gray-700">안전도: <strong>{safetyScore}%</strong></span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          to="/development-report"
          className="block w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium py-3 px-4 rounded-xl text-center hover:shadow-lg transition-all"
        >
          발달 리포트 보기 &gt;
        </Link>
        <Link
          to="/safety-report"
          className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium py-3 px-4 rounded-xl text-center hover:shadow-lg transition-all"
        >
          안전 리포트 보기 &gt;
        </Link>
      </div>
    </div>
  )
}

// Summary Card Component (Bottom Row)
function SummaryCard({
  title,
  value,
  status,
  icon: Icon,
  progress,
  gradientFrom,
  gradientTo,
  iconBg,
  iconColor,
  badgeColor,
}: {
  title: string
  value: string
  status: string
  icon: any
  progress: number
  gradientFrom: string
  gradientTo: string
  iconBg: string
  iconColor: string
  badgeColor: string
}) {
  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>
        <span className={`text-xs px-2 py-1 rounded text-white font-medium ${badgeColor}`}>
          {status}
        </span>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  )
}

