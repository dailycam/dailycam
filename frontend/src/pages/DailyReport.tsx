import { useState, useEffect } from 'react'
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Lightbulb,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Video,
} from 'lucide-react'
import ComposedTrendChart from '../components/Charts/ComposedTrendChart'
import HighlightCard from '../components/VideoHighlights/HighlightCard'
import VideoPlayer from '../components/VideoHighlights/VideoPlayer'
import { getLatestDailyReport, getDailyReport } from '../lib/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function DailyReport() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedVideo, setSelectedVideo] = useState<any>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // 그래프 데이터 생성 (time_slots 기반)
  const generateGraphData = (timeSlots: any[]) => {
    if (!timeSlots || timeSlots.length === 0) {
      // 기본 더미 데이터 (데이터가 없을 때)
      return [
        { date: '11/05', safety: 85, incidents: 5, activity: 75 },
        { date: '11/06', safety: 88, incidents: 3, activity: 80 },
        { date: '11/07', safety: 92, incidents: 2, activity: 85 },
        { date: '11/08', safety: 87, incidents: 4, activity: 78 },
        { date: '11/09', safety: 90, incidents: 3, activity: 82 },
        { date: '11/10', safety: 95, incidents: 1, activity: 88 },
        { date: '11/11', safety: 93, incidents: 2, activity: 86 },
      ]
    }
    
    // time_slots를 그래프 형식으로 변환
    return timeSlots.map((slot, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (timeSlots.length - index - 1))
      const dateStr = `${date.getMonth() + 1}/${date.getDate().toString().padStart(2, '0')}`
      
      // activity를 숫자로 변환 (낮은=30, 중간=60, 높은=90)
      let activityNum = 60
      if (slot.activity?.includes('낮은')) activityNum = 30
      else if (slot.activity?.includes('높은')) activityNum = 90
      
      return {
        date: dateStr,
        safety: slot.safety_score || 0,
        incidents: slot.incidents || 0,
        activity: activityNum,
      }
    })
  }
  
  const weeklyTrendData = generateGraphData(reportData?.time_slots || [])

  // 리포트 데이터 로드
  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true)
        let data = null
        
        // 1. 로컬 스토리지에서 리포트 ID 확인
        const reportId = localStorage.getItem('latestReportId')
        
        if (reportId && reportId !== '') {
          try {
            console.log(`리포트 ID로 조회 시도: ${reportId}`)
            data = await getDailyReport(parseInt(reportId))
            console.log('리포트 조회 성공:', data?.report_id)
          } catch (error: any) {
            const errorMessage = error.message || String(error)
            console.log(`리포트 ID 조회 실패 (${reportId}):`, errorMessage)
            
            // 404나 422는 리포트가 없는 것이므로 최신 리포트 조회 시도
            if (errorMessage.includes('404') || errorMessage.includes('422') || errorMessage.includes('리포트를 찾을 수 없습니다')) {
              console.log('최신 리포트 조회 시도...')
              try {
                data = await getLatestDailyReport()
                console.log('최신 리포트 조회 성공:', data?.report_id)
                // 최신 리포트 ID 업데이트
                if (data?.report_id) {
                  localStorage.setItem('latestReportId', data.report_id.toString())
                }
              } catch (latestError: any) {
                const latestErrorMessage = latestError.message || String(latestError)
                // 리포트가 없는 것은 정상 상황
                if (!latestErrorMessage.includes('404') && !latestErrorMessage.includes('422') && !latestErrorMessage.includes('리포트를 찾을 수 없습니다')) {
                  console.error('최신 리포트 조회 실패:', latestError)
                }
                data = null
              }
            } else {
              // 다른 오류는 로그 출력
              console.error('리포트 조회 실패:', error)
              data = null
            }
          }
        } else {
          // 리포트 ID가 없으면 최신 리포트 조회
          console.log('최신 리포트 조회 시도...')
          try {
            data = await getLatestDailyReport()
            console.log('최신 리포트 조회 성공:', data?.report_id)
            // 리포트 ID 저장
            if (data?.report_id) {
              localStorage.setItem('latestReportId', data.report_id.toString())
            }
          } catch (error: any) {
            const errorMessage = error.message || String(error)
            // 404나 422는 리포트가 없는 것이므로 정상 (에러 로그 출력 안 함)
            if (!errorMessage.includes('404') && !errorMessage.includes('422') && !errorMessage.includes('리포트를 찾을 수 없습니다')) {
              console.error('리포트 로드 실패:', error)
            }
            data = null
          }
        }
        
        if (data) {
          setReportData(data)
        } else {
          console.log('리포트 데이터가 없습니다.')
        }
      } catch (error) {
        console.error('리포트 로드 중 예상치 못한 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadReport()
  }, [])

  // 리포트 날짜 포맷팅
  const formatReportDate = (dateString?: string) => {
    if (!dateString) {
      const today = new Date()
      return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
    }
    const date = new Date(dateString)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`
  }

  // 위험 건수 계산
  const getTotalRisks = () => {
    if (!reportData?.risk_priorities) return 0
    return reportData.risk_priorities.filter((r: any) => r.level === 'high' || r.level === 'medium').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">리포트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="space-y-6">
        <div className="card text-center py-12">
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">일일 리포트</h1>
          <p className="text-gray-600 mt-1">AI가 분석한 오늘의 안전 리포트</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            공유
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            다운로드
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary-600" />
            <span className="text-lg font-semibold text-gray-900">
              {formatReportDate(reportData.report_date)}
            </span>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* AI Summary */}
      <div className="card bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2">AI 한줄평</h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              "{reportData.overall_summary || '분석 데이터가 없습니다.'}"
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-safe rounded-full"></div>
                <span className="text-sm text-gray-700">
                  안전도: <strong>{reportData.safety_metrics?.safe_zone_percentage || 0}%</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <span className="text-sm text-gray-700">
                  주의 필요: <strong>{getTotalRisks()}건</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="총 모니터링 시간"
          value={reportData.safety_metrics?.total_monitoring_time || "0시간"}
          change=""
          trend="neutral"
          icon={Clock}
        />
        <MetricCard
          title="감지된 위험"
          value={`${getTotalRisks()}건`}
          change=""
          trend="neutral"
          icon={AlertTriangle}
        />
        <MetricCard
          title="세이프존 체류율"
          value={`${reportData.safety_metrics?.safe_zone_percentage || 0}%`}
          change=""
          trend="neutral"
          icon={CheckCircle2}
        />
        <MetricCard
          title="활동 지수"
          value={reportData.safety_metrics?.activity_level || "보통"}
          change=""
          trend="neutral"
          icon={TrendingUp}
        />
      </div>

      {/* Weekly Trend Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">주간 안전도 추이</h2>
        <div className="h-64">
          <ComposedTrendChart data={weeklyTrendData} />
        </div>
      </div>

      {/* Risk Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Priority */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">위험도 우선순위</h2>
          <div className="space-y-3">
            {reportData.risk_priorities && reportData.risk_priorities.length > 0 ? (
              reportData.risk_priorities.map((risk: any, index: number) => (
            <RiskDetailItem
                  key={index}
                  level={risk.level}
                  title={risk.title}
                  description={risk.description}
                  location={risk.location || "위치 정보 없음"}
                  time={risk.time || "시간 정보 없음"}
                />
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">위험 상황이 감지되지 않았습니다.</p>
            )}
          </div>
        </div>

        {/* Time-based Analysis */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">시간대별 활동</h2>
          <div className="space-y-4">
            {reportData.time_slots && reportData.time_slots.length > 0 ? (
              reportData.time_slots.map((slot: any, index: number) => (
            <TimeSlot
                  key={index}
                  time={slot.time}
                  activity={slot.activity || "보통"}
                  safetyScore={slot.safety_score || 0}
                  incidents={slot.incidents || 0}
            />
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">시간대별 데이터가 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Recommendations */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">즉시 실행 리스트</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportData.action_recommendations && reportData.action_recommendations.length > 0 ? (
            reportData.action_recommendations.map((action: any, index: number) => (
          <ActionRecommendation
                key={index}
                priority={action.priority}
                title={action.title}
                description={action.description}
                estimatedCost={action.estimated_cost || "정보 없음"}
                difficulty={action.difficulty || "보통"}
              />
            ))
          ) : (
            <div className="col-span-2">
              <p className="text-gray-500 text-center py-8">추천 사항이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Video Highlights */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary-600" />
              하이라이트 영상
            </h2>
            <p className="text-sm text-gray-500 mt-1">위험 상황이 발생한 순간을 자동으로 편집했습니다</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportData.highlights && reportData.highlights.length > 0 ? (
            reportData.highlights.map((highlight: any) => (
            <HighlightCard
              key={highlight.id}
                id={highlight.id}
                title={highlight.title}
                timestamp={highlight.timestamp}
                duration={highlight.duration}
                location={highlight.location || "위치 정보 없음"}
                severity={highlight.severity}
                description={highlight.description}
                thumbnailUrl={highlight.thumbnail_url}
                videoUrl={highlight.video_url ? `${API_BASE_URL}${highlight.video_url}` : undefined}
                onPlay={() => setSelectedVideo(highlight)}
            />
            ))
          ) : (
            <div className="col-span-3">
              <p className="text-gray-500 text-center py-8">하이라이트 영상이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Location Heatmap Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">공간별 활동 히트맵</h2>
          <a href="/analytics" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            상세 분석 보기 →
          </a>
        </div>
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">히트맵 시각화 영역</p>
          <p className="text-sm text-gray-500 mt-1">
            실제 구현 시 Canvas 또는 SVG로 공간별 활동 빈도를 표시
          </p>
        </div>
      </div>

      {/* Daily Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryStatCard label="총 이동 거리" value="약 2.3km" />
        <SummaryStatCard label="평균 활동 강도" value="중간" />
        <SummaryStatCard label="낮잠 시간" value="2시간 15분" />
        <SummaryStatCard label="안전 점수" value="A+" />
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          title={selectedVideo.title || '하이라이트 영상'}
          videoUrl={selectedVideo.video_url ? `${API_BASE_URL}${selectedVideo.video_url}` : undefined}
          onClose={() => setSelectedVideo(null)}
        />
      )}

    </div>
  )
}

// Metric Card Component
function MetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: any
}) {
  const trendColors = {
    up: 'text-safe',
    down: 'text-danger',
    neutral: 'text-gray-500',
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Clock

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-5 h-5 text-gray-600" />
        <TrendIcon className={`w-4 h-4 ${trendColors[trend]}`} />
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className={`text-xs ${trendColors[trend]}`}>{change}</p>
    </div>
  )
}

// Risk Detail Item Component
function RiskDetailItem({
  level,
  title,
  description,
  location,
  time,
}: {
  level: 'high' | 'medium' | 'low'
  title: string
  description: string
  location: string
  time: string
}) {
  const levelConfig = {
    high: { color: 'border-danger-500 bg-danger-50', badge: 'bg-danger text-white' },
    medium: { color: 'border-warning-500 bg-warning-50', badge: 'bg-warning text-white' },
    low: { color: 'border-gray-300 bg-gray-50', badge: 'bg-gray-400 text-white' },
  }

  const config = levelConfig[level]

  return (
    <div className={`p-4 border-l-4 rounded-lg ${config.color}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className={`text-xs px-2 py-1 rounded ${config.badge}`}>
          {level === 'high' ? '높음' : level === 'medium' ? '중간' : '낮음'}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-3">{description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {location}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {time}
        </div>
      </div>
    </div>
  )
}

// Time Slot Component
function TimeSlot({
  time,
  activity,
  safetyScore,
  incidents,
}: {
  time: string
  activity: string
  safetyScore: number
  incidents: number
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-900">{time}</span>
        <span className="text-xs text-gray-600">{activity}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>안전도</span>
            <span className="font-semibold">{safetyScore}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                safetyScore >= 90 ? 'bg-safe' : safetyScore >= 70 ? 'bg-warning' : 'bg-danger'
              }`}
              style={{ width: `${safetyScore}%` }}
            ></div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">위험</p>
          <p className="text-sm font-semibold text-gray-900">{incidents}건</p>
        </div>
      </div>
    </div>
  )
}

// Action Recommendation Component
function ActionRecommendation({
  priority,
  title,
  description,
  estimatedCost,
  difficulty,
}: {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimatedCost: string
  difficulty: string
}) {
  const priorityConfig = {
    high: { color: 'border-danger-500', badge: 'bg-danger' },
    medium: { color: 'border-warning-500', badge: 'bg-warning' },
    low: { color: 'border-gray-300', badge: 'bg-gray-400' },
  }

  const config = priorityConfig[priority]

  return (
    <div className={`p-4 border-l-4 rounded-lg bg-white shadow-sm ${config.color}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex-1">{title}</h3>
        <span className={`text-xs px-2 py-1 rounded text-white ${config.badge}`}>
          {priority === 'high' ? '긴급' : priority === 'medium' ? '권장' : '선택'}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-3">{description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span>💰 {estimatedCost}</span>
        <span>🔧 {difficulty}</span>
      </div>
    </div>
  )
}

// Summary Stat Card Component
function SummaryStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}
