import { useState, useEffect } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import SafetyTrendChart from '../components/charts/SafetyTrendChart'
import IncidentPieChart from '../components/charts/IncidentPieChart'
import ComposedTrendChart from '../components/charts/ComposedTrendChart'
import { fetchAnalyticsData, type AnalyticsData } from '../lib/api'

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)

  // 데이터베이스에서 데이터 가져오기
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const analyticsData = await fetchAnalyticsData()
        setData(analyticsData)
      } catch (err) {
        console.error('Analytics 데이터 로드 오류:', err)
        setError('데이터를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [timeRange])

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 데이터 없음
  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">데이터 분석</h1>
          <p className="text-gray-600 mt-1">장기 트렌드와 패턴을 분석합니다 (실시간 DB 연동)</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="input-field py-2"
          >
            <option value="week">최근 7일</option>
            <option value="month">최근 1달</option>
            <option value="quarter">최근 3달</option>
          </select>
        </div>
      </div>

      {/* Key Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrendCard
          title="평균 안전도"
          value={`${Math.round(data.summary.avg_safety_score)}%`}
          change={`${(data.summary.safety_change_percent || 0) > 0 ? '+' : ''}${Math.round(data.summary.safety_change_percent || 0)}%`}
          trend={(data.summary.safety_change_percent || 0) > 0 ? 'up' : (data.summary.safety_change_percent || 0) < 0 ? 'down' : 'neutral'}
        />
        <TrendCard
          title="총 위험 감지"
          value={`${data.summary.total_incidents}건`}
          change={`${(data.summary.incident_change || 0) > 0 ? '+' : ''}${Math.round(data.summary.incident_change || 0)}건`}
          trend={(data.summary.incident_change || 0) > 0 ? 'up' : (data.summary.incident_change || 0) < 0 ? 'down' : 'neutral'}
          inverse={true}
        />
        <TrendCard
          title="세이프존 체류"
          value={`${Math.round(data.summary.safe_zone_percentage)}%`}
          change="+2%"
          trend="up"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safety Score Trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">안전도 추이</h2>
            <TrendingUp className="w-5 h-5 text-safe" />
          </div>
          <div className="h-64">
            <SafetyTrendChart data={data.weekly_trend.map(item => ({
              day: item.date,
              score: item.safety,
              incidents: item.incidents
            }))} />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">평균</p>
              <p className="text-base font-bold text-gray-900">{Math.round(data.summary.avg_safety_score)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">최고</p>
              <p className="text-base font-bold text-safe">{Math.max(...data.weekly_trend.map(d => d.safety))}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">최저</p>
              <p className="text-base font-bold text-warning">{Math.min(...data.weekly_trend.map(d => d.safety))}%</p>
            </div>
          </div>
        </div>

        {/* Incident Types */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">위험 유형별 분포</h2>
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div className="h-64">
            <IncidentPieChart data={data.incident_distribution} />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              {data.incident_distribution.map((item) => (
                <IncidentTypeItem
                  key={item.name}
                  type={item.name}
                  count={item.value}
                  color={`bg-[${item.color}]`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">주간 종합 트렌드</h2>
            <p className="text-sm text-gray-500 mt-1">안전도, 위험 감지, 활동량 비교</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-safe"></div>
              <span className="text-gray-600">안전도</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-primary-500"></div>
              <span className="text-gray-600">활동량</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-danger"></div>
              <span className="text-gray-600">위험</span>
            </div>
          </div>
        </div>
        <div className="h-80">
          <ComposedTrendChart data={data.weekly_trend} />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">주간 평균 안전도</p>
              <p className="text-lg font-bold text-gray-900">{Math.round(data.summary.avg_safety_score)}%</p>
              <p className={`text-xs mt-1 ${(data.summary.safety_change_percent || 0) >= 0 ? 'text-safe' : 'text-danger'}`}>
                {(data.summary.safety_change_percent || 0) > 0 ? '+' : ''}{Math.round(data.summary.safety_change_percent || 0)}% {(data.summary.safety_change_percent || 0) >= 0 ? '↑' : '↓'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">총 위험 감지</p>
              <p className="text-lg font-bold text-gray-900">{data.summary.total_incidents}건</p>
              <p className={`text-xs mt-1 ${(data.summary.incident_change || 0) <= 0 ? 'text-safe' : 'text-danger'}`}>
                {(data.summary.incident_change || 0) > 0 ? '+' : ''}{Math.round(data.summary.incident_change || 0)}건 {(data.summary.incident_change || 0) >= 0 ? '↑' : '↓'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">평균 활동량</p>
              <p className="text-lg font-bold text-gray-900">{Math.round(data.weekly_trend.reduce((sum, d) => sum + d.activity, 0) / data.weekly_trend.length)}%</p>
              <p className="text-xs text-primary-600 mt-1">정상 범위</p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Insights */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">주요 인사이트</h2>
          <div className="space-y-3">
            <InsightItem
              icon="📈"
              title="안전도 개선"
              description="지난 주 대비 안전도가 12% 향상되었습니다"
              trend="positive"
            />
            <InsightItem
              icon="⚠️"
              title="주방 접근 증가"
              description="주방 데드존 접근이 30% 증가했습니다"
              trend="negative"
            />
            <InsightItem
              icon="🎯"
              title="세이프존 최적화"
              description="현재 세이프존 설정이 효과적으로 작동하고 있습니다"
              trend="positive"
            />
          </div>
        </div>

        {/* Comparison */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기간별 비교</h2>
          <div className="space-y-4">
            <ComparisonItem
              label="이번 주 평균 안전도"
              current={Math.round(data.summary.avg_safety_score)}
              previous={Math.round(data.summary.prev_avg_safety || 0)}
              unit="%"
            />
            <ComparisonItem
              label="감지된 위험"
              current={data.summary.total_incidents}
              previous={data.summary.prev_total_incidents || 0}
              unit="건"
              inverse
            />
            <ComparisonItem
              label="세이프존 체류율"
              current={Math.round(data.summary.safe_zone_percentage * 10) / 10}
              previous={Math.round((data.summary.safe_zone_percentage - (data.summary.incident_reduction_percentage || 0) / 10) * 10) / 10}
              unit="%"
            />
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">데이터 내보내기</h3>
            <p className="text-sm text-gray-600">
              상세 분석 데이터를 CSV 또는 PDF 형식으로 다운로드하세요
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary">CSV 다운로드</button>
            <button className="btn-primary">PDF 리포트</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Trend Card Component
function TrendCard({
  title,
  value,
  change,
  trend,
  inverse = false,
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  inverse?: boolean  // true면 up이 나쁨, down이 좋음
}) {
  // inverse: 증가가 나쁜 경우 (위험 감지 등)
  const getColor = () => {
    if (trend === 'neutral') return 'text-gray-500'
    if (inverse) {
      return trend === 'up' ? 'text-danger' : 'text-safe'
    }
    return trend === 'up' ? 'text-safe' : 'text-danger'
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingUp : Activity
  const color = getColor()

  return (
    <div className="card">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
      <div className="flex items-center gap-2">
        <TrendIcon className={`w-4 h-4 ${color} ${trend === 'down' ? 'rotate-180' : ''}`} />
        <span className={`text-xs ${color}`}>{change}</span>
      </div>
    </div>
  )
}

// Incident Type Item Component
function IncidentTypeItem({
  type,
  count,
  color,
}: {
  type: string
  count: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded ${color}`}></div>
      <span className="text-sm text-gray-700 flex-1">{type}</span>
      <span className="text-sm font-semibold text-gray-900">{count}</span>
    </div>
  )
}

// Insight Item Component
function InsightItem({
  icon,
  title,
  description,
  trend,
}: {
  icon: string
  title: string
  description: string
  trend: 'positive' | 'negative'
}) {
  return (
    <div className={`p-3 rounded-lg ${trend === 'positive' ? 'bg-safe-50' : 'bg-warning-50'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">{title}</h4>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  )
}

// Comparison Item Component
function ComparisonItem({
  label,
  current,
  previous,
  unit,
  inverse = false,
}: {
  label: string
  current: number
  previous: number
  unit: string
  inverse?: boolean
}) {
  const diff = current - previous
  const isPositive = inverse ? diff < 0 : diff > 0
  const percentage = Math.abs((diff / previous) * 100).toFixed(1)

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900">
          {current}
          <span className="text-sm font-normal text-gray-600 ml-1">{unit}</span>
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500 mb-1">지난 주</p>
        <p className={`text-sm font-semibold ${isPositive ? 'text-safe' : 'text-danger'}`}>
          {diff > 0 ? '+' : ''}
          {diff.toFixed(1)} ({percentage}%)
        </p>
      </div>
    </div>
  )
}

