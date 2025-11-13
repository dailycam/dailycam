import { useState, useEffect } from 'react'
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
  Download,
  Share2,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { getLatestDailyReport, getDailyReport } from '../lib/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// 커스텀 색상
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
}

export default function DailyReport() {
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 리포트 데이터 로드
  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 1. 로컬 스토리지에서 리포트 ID 확인
        const reportId = localStorage.getItem('latestReportId')
        
        let data = null
        if (reportId && reportId !== '') {
          try {
            data = await getDailyReport(parseInt(reportId))
            console.log('리포트 조회 성공:', data?.report_id)
          } catch (err: any) {
            console.log('리포트 ID 조회 실패, 최신 리포트 조회 시도...')
            // 최신 리포트 조회
            try {
              data = await getLatestDailyReport()
              if (data?.report_id) {
                localStorage.setItem('latestReportId', data.report_id.toString())
              }
            } catch (latestErr) {
              console.log('최신 리포트도 없음')
            }
          }
        } else {
          // 리포트 ID가 없으면 최신 리포트 조회
          try {
            data = await getLatestDailyReport()
            if (data?.report_id) {
              localStorage.setItem('latestReportId', data.report_id.toString())
            }
          } catch (err) {
            console.log('리포트가 없습니다')
          }
        }
        
        if (data) {
          setReportData(data)
        }
      } catch (err: any) {
        setError(err.message || '리포트를 불러오는 중 오류가 발생했습니다.')
        console.error('리포트 로드 오류:', err)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [])

  // 리포트 날짜 포맷
  const formatReportDate = (dateStr: string) => {
    if (!dateStr) return '날짜 없음'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })
    } catch {
      return dateStr
    }
  }

  // 위험 항목 총 개수
  const getTotalRisks = () => {
    if (!reportData?.risk_priorities) return 0
    return reportData.risk_priorities.reduce((sum: number, risk: any) => sum + (risk.count || 1), 0)
  }

  // 안전도 점수 색상
  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return COLORS.success
    if (score >= 60) return COLORS.warning
    return COLORS.danger
  }

  // 안전도 점수 상태 텍스트
  const getSafetyScoreStatus = (score: number) => {
    if (score >= 80) return '안전'
    if (score >= 60) return '주의'
    return '위험'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <div className="text-gray-600">리포트 로딩 중...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">오류 발생</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">리포트 데이터가 없습니다</h2>
          <p className="text-gray-600 mb-6">비디오를 분석하여 리포트를 생성해주세요.</p>
          <a href="/camera-setup" className="btn-primary inline-flex items-center gap-2">
            비디오 분석하기
          </a>
        </div>
      </div>
    )
  }

  const chartData = reportData.chart_data || {}
  const safetyScore = reportData.safety_metrics?.safety_score || 0
  const safetyScoreColor = getSafetyScoreColor(safetyScore)
  const safetyScoreStatus = getSafetyScoreStatus(safetyScore)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">일일 안전 리포트</h1>
          <p className="text-gray-600 mt-1">AI가 분석한 오늘의 상세 안전 리포트</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            공유
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            PDF 다운로드
          </button>
        </div>
      </div>

      {/* Date and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date Card */}
        <div className="card">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary-600" />
            <div>
              <p className="text-sm text-gray-600">리포트 날짜</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatReportDate(reportData.report_date)}
              </p>
            </div>
          </div>
        </div>

        {/* Safety Score Card */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: `${safetyScoreColor}20` }}>
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: safetyScoreColor }}>
                    {safetyScore}
                  </div>
                  <div className="text-xs text-gray-600">점</div>
                </div>
              </div>
              <Shield className="w-8 h-8 absolute -top-1 -right-1" style={{ color: safetyScoreColor }} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                안전도: <span style={{ color: safetyScoreColor }}>{safetyScoreStatus}</span>
              </h3>
              <p className="text-sm text-gray-600">
                {reportData.overall_summary || 'AI 분석 결과가 없습니다.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-blue-900">총 모니터링 시간</h3>
          </div>
          <p className="text-3xl font-bold text-blue-900">
            {reportData.safety_metrics?.total_monitoring_time || "0분"}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-medium text-red-900">감지된 사건</h3>
          </div>
          <p className="text-3xl font-bold text-red-900">{reportData.safety_metrics?.incident_count || 0}건</p>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-medium text-green-900">세이프존 체류율</h3>
          </div>
          <p className="text-3xl font-bold text-green-900">
            {reportData.safety_metrics?.safe_zone_percentage || 0}%
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-medium text-purple-900">활동 지수</h3>
          </div>
          <p className="text-3xl font-bold text-purple-900">
            {reportData.safety_metrics?.activity_level === 'high' ? '높음' :
             reportData.safety_metrics?.activity_level === 'low' ? '낮음' : '보통'}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      {chartData && (chartData.risk_distribution?.length > 0 || chartData.hourly_activity?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Distribution Pie Chart */}
          {chartData.risk_distribution && chartData.risk_distribution.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">위험도 분포</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.risk_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => value > 0 ? `${name}: ${value}건` : ''}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.risk_distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hourly Activity Line Chart */}
          {chartData.hourly_activity && chartData.hourly_activity.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">시간대별 활동</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.hourly_activity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="activity" stroke={COLORS.primary} name="활동 수준" />
                  <Line type="monotone" dataKey="incidents" stroke={COLORS.danger} name="사건 수" />
                  <Line type="monotone" dataKey="safety_score" stroke={COLORS.success} name="안전 점수" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Risk Priorities */}
      {reportData.risk_priorities && reportData.risk_priorities.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            위험도 우선순위
          </h2>
          <div className="space-y-3">
            {reportData.risk_priorities.map((risk: any, index: number) => (
              <div key={index} className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                risk.level === 'high' ? 'border-red-500 bg-red-50' :
                risk.level === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-green-500 bg-green-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      risk.level === 'high' ? 'bg-red-500 text-white' :
                      risk.level === 'medium' ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {risk.level === 'high' ? '높음' : risk.level === 'medium' ? '중간' : '낮음'}
                    </span>
                    <h3 className="font-semibold text-gray-900">{risk.title}</h3>
                  </div>
                  {risk.count > 1 && (
                    <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded-full">
                      {risk.count}회 발생
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mb-1">{risk.description}</p>
                {risk.location && (
                  <p className="text-xs text-gray-500">📍 위치: {risk.location}</p>
                )}
                {risk.time && (
                  <p className="text-xs text-gray-500">⏰ 시간: {risk.time}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Recommendations */}
      {reportData.action_recommendations && reportData.action_recommendations.length > 0 && (
        <div className="card bg-gradient-to-br from-indigo-50 to-purple-50">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            즉시 실행 리스트
          </h2>
          <div className="space-y-3">
            {reportData.action_recommendations.map((rec: any, index: number) => (
              <div key={index} className="border-l-4 border-indigo-500 pl-4 py-3 bg-white rounded-r-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    rec.priority === 'high' ? 'bg-red-500 text-white' :
                    rec.priority === 'medium' ? 'bg-yellow-500 text-white' :
                    'bg-gray-400 text-white'
                  }`}>
                    {rec.priority === 'high' ? '긴급' : rec.priority === 'medium' ? '권장' : '선택'}
                  </span>
                  <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                </div>
                <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                {rec.estimated_cost && (
                  <p className="text-xs text-gray-600">💰 예상 비용: {rec.estimated_cost}</p>
                )}
                {rec.difficulty && (
                  <p className="text-xs text-gray-600">⚙️ 난이도: {rec.difficulty}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
