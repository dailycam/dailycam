import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Shield,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle2,
  Baby,
  Eye,
  Video,
  ChevronRight,
  Sparkles,
  FileVideo,
  ArrowRight,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getDashboardData, type DashboardData } from '../lib/api'

type TimeRangeType = 'day' | 'week' | 'month' | 'year'

export default function Dashboard() {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate] = useState(new Date())
  const [timeRange] = useState<TimeRangeType>('week')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const dashboard = await getDashboardData(7)
        setDashboardData(dashboard)
      } catch (err: any) {
        console.error('대시보드 데이터 로딩 오류:', err)
        setError(err.message)
        setDashboardData(null)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 데이터 없으면 empty state
  if (!dashboardData || error) {
    return (
      <div className="p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl mb-2 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent font-bold">
            대시보드
          </h1>
          <p className="text-gray-600">아이의 발달과 안전을 한눈에 확인하세요</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center min-h-[500px]"
        >
          <div className="text-center max-w-2xl">
            <div className="mb-8">
              <div className="mx-auto w-32 h-32 bg-gradient-to-br from-primary-100 via-blue-100 to-cyan-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Sparkles className="w-16 h-16 text-primary-600" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              분석 데이터가 없습니다
            </h2>

            <p className="text-gray-600 mb-10 text-lg leading-relaxed">
              비디오를 분석하면 AI가 아이의 발달 현황과 안전 상태를 자동으로 분석합니다.
              <br />
              발달 리포트, 안전 리포트, 타임라인 등 다양한 정보를 대시보드에서 확인할 수 있어요.
            </p>

            <button
              onClick={() => navigate('/video-analysis-test')}
              className="btn-primary inline-flex items-center gap-3 px-10 py-4 text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5"
            >
              <FileVideo className="w-6 h-6" />
              첫 비디오 분석 시작하기
              <ArrowRight className="w-6 h-6" />
            </button>

            <p className="text-sm text-gray-500 mt-6">
              💡 비디오 분석은 약 1-2분 정도 소요됩니다
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // 데이터 있으면 원래 UI 표시
  const stats = [
    {
      label: '안전 점수',
      value: dashboardData.safetyScore?.toString() || '0',
      unit: '점',
      change: '+3',
      changeLabel: '지난주 대비',
      icon: Shield,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      trend: 'up'
    },
    {
      label: '발달 점수',
      value: '92',
      unit: '점',
      change: '+7',
      changeLabel: '지난주 대비',
      icon: Baby,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      trend: 'up'
    },
    {
      label: '모니터링 시간',
      value: dashboardData.monitoringHours?.toString() || '0',
      unit: '시간',
      change: '오늘',
      changeLabel: '누적',
      icon: Eye,
      color: 'text-safe',
      bgColor: 'bg-safe-50',
      trend: 'neutral'
    },
    {
      label: '이벤트 감지',
      value: dashboardData.incidentCount?.toString() || '0',
      unit: '건',
      change: '모두 해결됨',
      changeLabel: '',
      icon: Activity,
      color: 'text-warning',
      bgColor: 'bg-warning-50',
      trend: 'neutral'
    },
  ]

  const chartData = dashboardData.weeklyTrend || []

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="mb-6">
          <p className="text-gray-500 mb-1">오늘도 함께해요</p>
          <h1 className="text-4xl mb-2 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent">
            지수는 기분이 아주 좋아요!
          </h1>
          <p className="text-gray-600 leading-relaxed">
            {dashboardData.summary || '오늘 하루도 건강하고 안전하게 보냈어요.'}
          </p>
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
            >
              <div className={`card p-5 border-0 shadow-sm hover:shadow-md transition-shadow ${stat.bgColor}`}>
                <div className="flex items-start justify-between mb-3">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  {stat.trend === 'up' && (
                    <span className="text-xs text-safe flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
                    </span>
                  )}
                </div>
                <div className="mb-1">
                  <span className={`text-3xl ${stat.color}`}>{stat.value}</span>
                  <span className="text-gray-500 ml-1">{stat.unit}</span>
                </div>
                <p className="text-xs text-gray-600 mb-0.5">{stat.label}</p>
                <p className="text-xs text-gray-400">{stat.changeLabel}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 주간 트렌드 차트 */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <div className="card p-6 border-0 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-primary-500" />
                <div>
                  <h2 className="text-xl font-semibold">주간 안전 트렌드</h2>
                  <p className="text-sm text-gray-500">최근 7일간 안전 점수 추이</p>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSafety" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fill="url(#colorSafety)"
                  animationDuration={1500}
                  name="안전 점수"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* 위험 요소 및 권장사항 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* 위험 요소 */}
        {dashboardData.risks && dashboardData.risks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="card p-6 border-0 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">감지된 위험 요소</h3>
              <div className="space-y-3">
                {dashboardData.risks.map((risk, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${risk.level === 'high' ? 'text-red-700' :
                          risk.level === 'medium' ? 'text-orange-700' :
                            'text-yellow-700'
                        }`}>{risk.title}</span>
                      <span className="text-xs text-gray-500">{risk.time}</span>
                    </div>
                    <p className="text-xs text-gray-600">발생 횟수: {risk.count}회</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 권장사항 */}
        {dashboardData.recommendations && dashboardData.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="card p-6 border-0 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">AI 권장사항</h3>
              <div className="space-y-3">
                {dashboardData.recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{rec.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 ml-6">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
