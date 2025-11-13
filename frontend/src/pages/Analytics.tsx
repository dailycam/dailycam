import { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  Activity,
  Filter,
} from 'lucide-react'
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'
import IncidentPieChart from '../components/Charts/IncidentPieChart'
import ActivityBarChart from '../components/Charts/ActivityBarChart'
import HourlyHeatmap from '../components/Charts/HourlyHeatmap'
import ComposedTrendChart from '../components/Charts/ComposedTrendChart'
import { generateWeeklySafetyData, generateHourlyActivityData } from '../utils/mockData'

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week')
  
  const weeklyData = generateWeeklySafetyData()
  const hourlyData = generateHourlyActivityData()
  

  const weeklyTrendData = [
    { date: '11/05', safety: 85, incidents: 5, activity: 75 },
    { date: '11/06', safety: 88, incidents: 3, activity: 80 },
    { date: '11/07', safety: 92, incidents: 2, activity: 85 },
    { date: '11/08', safety: 87, incidents: 4, activity: 78 },
    { date: '11/09', safety: 90, incidents: 3, activity: 82 },
    { date: '11/10', safety: 95, incidents: 1, activity: 88 },
    { date: '11/11', safety: 93, incidents: 2, activity: 86 },
  ]
  
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">데이터 분석</h1>
          <p className="text-gray-600 mt-1">장기 트렌드와 패턴을 분석합니다</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            필터
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="input-field py-2"
          >
            <option value="week">최근 7일</option>
            <option value="month">최근 30일</option>
            <option value="year">최근 1년</option>
          </select>
        </div>
      </div>

      {/* Key Trends */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TrendCard
          title="평균 안전도"
          value="89%"
          change="+3%"
          trend="up"
        />
        <TrendCard
          title="주간 위험 감소"
          value="42%"
          change="-12건"
          trend="down"
        />
        <TrendCard
          title="세이프존 체류"
          value="91%"
          change="+2%"
          trend="up"
        />
        <TrendCard
          title="활동 패턴"
          value="안정적"
          change="변화 없음"
          trend="neutral"
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
            <SafetyTrendChart data={weeklyData} />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">평균</p>
              <p className="text-base font-bold text-gray-900">89%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">최고</p>
              <p className="text-base font-bold text-safe">95%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">최저</p>
              <p className="text-base font-bold text-warning">78%</p>
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
            <IncidentPieChart data={incidentData} />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <IncidentTypeItem type="데드존 접근" count={12} color="bg-danger" />
              <IncidentTypeItem type="모서리 충돌" count={8} color="bg-warning" />
              <IncidentTypeItem type="낙상 위험" count={3} color="bg-orange-500" />
              <IncidentTypeItem type="기타" count={2} color="bg-gray-400" />
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
              <div className="w-3 h-3 bg-danger rounded"></div>
              <span className="text-gray-600">위험</span>
            </div>
          </div>
        </div>
        <div className="h-80">
          <ComposedTrendChart data={weeklyTrendData} />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">주간 평균 안전도</p>
              <p className="text-lg font-bold text-gray-900">90%</p>
              <p className="text-xs text-safe mt-1">+5% ↑</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">총 위험 감지</p>
              <p className="text-lg font-bold text-gray-900">20건</p>
              <p className="text-xs text-safe mt-1">-8건 ↓</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">평균 활동량</p>
              <p className="text-lg font-bold text-gray-900">82%</p>
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
              current={89}
              previous={85}
              unit="%"
            />
            <ComparisonItem
              label="감지된 위험"
              current={18}
              previous={25}
              unit="건"
              inverse
            />
            <ComparisonItem
              label="세이프존 체류 시간"
              current={8.2}
              previous={7.8}
              unit="시간"
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
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
}) {
  const trendColors = {
    up: 'text-safe',
    down: 'text-danger',
    neutral: 'text-gray-500',
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingUp : Activity

  return (
    <div className="card">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
      <div className="flex items-center gap-2">
        <TrendIcon className={`w-4 h-4 ${trendColors[trend]} ${trend === 'down' ? 'rotate-180' : ''}`} />
        <span className={`text-xs ${trendColors[trend]}`}>{change}</span>
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

// Time Heatmap Bar Component
function TimeHeatmapBar({ time, level }: { time: string; level: number }) {
  const getColor = (level: number) => {
    if (level >= 80) return 'bg-danger'
    if (level >= 50) return 'bg-warning'
    return 'bg-safe'
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-24">{time}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
        <div
          className={`h-full ${getColor(level)} transition-all duration-300 flex items-center justify-end pr-2`}
          style={{ width: `${level}%` }}
        >
          <span className="text-xs text-white font-medium">{level}%</span>
        </div>
      </div>
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

