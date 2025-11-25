import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Shield,
  Clock,
  TrendingUp,
  Camera,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  if (!dashboardData) {
    // 더미 데이터도 없으면 에러 표시
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">데이터를 불러올 수 없습니다.</div>
      </div>
    )
  }

  // 주간 추이 데이터를 차트 형식으로 변환
  const weeklyData = dashboardData.weeklyTrend.length > 0
    ? dashboardData.weeklyTrend.map(item => ({
        day: item.day,
        score: item.score,
        incidents: item.incidents,
      }))
    : [] // 빈 배열이면 차트는 표시되지 않음
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-600 mt-1">오늘의 안전 현황을 한눈에 확인하세요</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="오늘의 안전도"
          value={`${dashboardData.safetyScore}%`}
          change={`평균 ${dashboardData.safetyScore.toFixed(1)}%`}
          icon={Shield}
          color="safe"
        />
        <StatCard
          title="감지된 위험"
          value={`${dashboardData.incidentCount}건`}
          change={`최근 ${dashboardData.rangeDays}일간`}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="모니터링 시간"
          value={`${dashboardData.monitoringHours}시간`}
          change={`최근 ${dashboardData.rangeDays}일간`}
          icon={Clock}
          color="primary"
        />
        <StatCard
          title="활동 패턴"
          value={dashboardData.activityPattern}
          change="AI 분석 결과"
          icon={Activity}
          color="safe"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's AI Summary */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AI 한줄평</h2>
            <span className="text-xs text-gray-500">오늘 오후 3:24 업데이트</span>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <p className="text-gray-800 text-base leading-relaxed mb-4">
              "{dashboardData.summary}"
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-safe" />
              <span>AI가 분석한 안전 현황</span>
            </div>
          </div>
        </div>

        {/* Camera Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">카메라 상태</h2>
          <div className="space-y-3">
            <CameraStatusItem name="거실 카메라" status="online" />
            <CameraStatusItem name="아이방 카메라" status="online" />
            <CameraStatusItem name="주방 카메라" status="offline" />
          </div>
          <button className="w-full mt-4 text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" />
            카메라 관리
          </button>
        </div>
      </div>

      {/* Risk Priority & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Priority */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">위험도 우선순위</h2>
          <div className="space-y-3">
            {dashboardData.risks.length > 0 ? (
              dashboardData.risks.map((risk, index) => (
                <RiskItem
                  key={index}
                  level={risk.level}
                  title={risk.title}
                  time={risk.time}
                  count={risk.count}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                감지된 위험 항목이 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Immediate Action List */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">즉시 실행 리스트</h2>
          <div className="space-y-3">
            {dashboardData.recommendations.length > 0 ? (
              dashboardData.recommendations.map((rec, index) => (
                <ActionItem
                  key={index}
                  priority={rec.priority}
                  title={rec.title}
                  description={rec.description}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                추천 사항이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">주간 안전도 추이</h2>
            <p className="text-sm text-gray-500 mt-1">지난 7일간의 안전도 변화</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-safe rounded-full"></div>
              <span className="text-gray-600">안전도</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          {weeklyData.length > 0 ? (
            <SafetyTrendChart data={weeklyData} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>주간 추이 데이터를 불러오는 중...</p>
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">평균 안전도</p>
              <p className="text-lg font-bold text-gray-900">
                {dashboardData.weeklyTrend.length > 0
                  ? `${(dashboardData.weeklyTrend.reduce((sum, d) => sum + d.score, 0) / dashboardData.weeklyTrend.length).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">최고 안전도</p>
              <p className="text-lg font-bold text-safe">
                {dashboardData.weeklyTrend.length > 0
                  ? `${Math.max(...dashboardData.weeklyTrend.map(d => d.score)).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">총 사건 수</p>
              <p className="text-lg font-bold text-primary-600">{dashboardData.incidentCount}건</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionButton
          title="실시간 모니터링"
          description="지금 아이의 모습 확인"
          href="/live-monitoring"
        />
        <QuickActionButton
          title="오늘의 리포트"
          description="상세 분석 보기"
          href="/daily-report"
        />
        <QuickActionButton
          title="히트맵 분석"
          description="위험 구간 확인"
          href="/analytics"
        />
      </div>

    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  change: string
  icon: any
  color: 'safe' | 'warning' | 'primary'
}) {
  const colorClasses = {
    safe: 'bg-safe-50 text-safe-700',
    warning: 'bg-warning-50 text-warning-700',
    primary: 'bg-primary-50 text-primary-700',
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{change}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

// Camera Status Item
function CameraStatusItem({ name, status }: { name: string; status: 'online' | 'offline' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Camera className="w-5 h-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {status === 'online' ? (
          <>
            <div className="w-2 h-2 bg-safe rounded-full animate-pulse"></div>
            <span className="text-xs text-safe-dark font-medium">온라인</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-xs text-gray-500 font-medium">오프라인</span>
          </>
        )}
      </div>
    </div>
  )
}

// Risk Item
function RiskItem({
  level,
  title,
  time,
  count,
}: {
  level: 'high' | 'medium' | 'low'
  title: string
  time: string
  count: number
}) {
  const levelConfig = {
    high: { color: 'bg-danger text-white', icon: XCircle },
    medium: { color: 'bg-warning text-white', icon: AlertTriangle },
    low: { color: 'bg-gray-400 text-white', icon: AlertTriangle },
  }

  const config = levelConfig[level]
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-lg ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-1">
          {time} · {count}회 발생
        </p>
      </div>
    </div>
  )
}

// Action Item
function ActionItem({
  priority,
  title,
  description,
}: {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
}) {
  const priorityColors = {
    high: 'border-danger-500 bg-danger-50',
    medium: 'border-warning-500 bg-warning-50',
    low: 'border-gray-300 bg-gray-50',
  }

  return (
    <div className={`p-4 border-l-4 rounded-lg ${priorityColors[priority]}`}>
      <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  )
}

// Quick Action Button
function QuickActionButton({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <a
      href={href}
      className="card hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
          {title}
        </h3>
        <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  )
}

