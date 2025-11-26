import { useState, useEffect } from 'react'
import {
  Shield,
  AlertTriangle,
  Clock,
  Download,
  Share2,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'
import IncidentPieChart from '../components/Charts/IncidentPieChart'
import { fetchAnalyticsData, type AnalyticsData } from '../lib/api'

export default function SafetyReport() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const analyticsData = await fetchAnalyticsData()
        setData(analyticsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터 로드 실패')
        console.error('Analytics 데이터 로드 오류:', err)
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

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50">
        <div className="text-red-600">에러: {error || '데이터를 불러올 수 없습니다'}</div>
      </div>
    )
  }

  const safetyScore = Math.round(data.summary.avg_safety_score)
  const safetyLevel = safetyScore >= 90 ? '우수' : safetyScore >= 70 ? '양호' : safetyScore >= 50 ? '주의' : '위험'

  // 목 데이터: 안전 이벤트 타임라인
  const recentEvents = [
    { time: '15:30', title: '주방 안전 게이트 접근 시도 - 차단됨', type: 'success' as const },
    { time: '13:15', title: '거실 테이블 모서리 접촉 - 보호대 작동 확인', type: 'success' as const },
    { time: '11:30', title: '예상치 못한 넘어짐 감지 - 즉시 회복', type: 'warning' as const },
    { time: '10:45', title: '계단 입구 접근 - 안전문 잠금 확인', type: 'success' as const },
    { time: '09:20', title: '작은 물건 접촉 시도 - 안전하게 제거됨', type: 'success' as const },
    { time: '08:00', title: '일일 안전 점검 완료 - 모든 안전 장치 정상 작동', type: 'success' as const },
  ]

  // 목 데이터: 주요 알림 메시지
  const importantMessages = [
    {
      priority: 'high' as const,
      title: '주방 근처 반복 접근',
      description: '아이가 주방 데드존에 자주 접근하고 있습니다. 안전 게이트 설치를 권장합니다.',
      color: 'red' as const,
    },
    {
      priority: 'medium' as const,
      title: '아동 물품 정리',
      description: '아이가 가지고 놀 수 있는 작은 물건들이 남아있어요.',
      color: 'yellow' as const,
    },
  ]

  // 목 데이터: 안전 조치 사항
  const safetyActions = [
    {
      priority: 'high' as const,
      title: '주방 안전 게이트 설치',
      icon: 'warning' as const,
    },
    {
      priority: 'medium' as const,
      title: '거실 테이블 모서리 보호대 추가',
      icon: 'warning' as const,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">안전 리포트</h1>
          <p className="text-gray-600 mt-1">AI가 분석한 아이의 안전 상태 리포트</p>
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

      {/* Safety Status Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Safety Gauge */}
        <div className="card bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-100">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-48 h-48 mb-4">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - safetyScore / 100)}`}
                  className="text-primary-600"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-gray-900">{safetyScore}</span>
                <span className="text-sm text-gray-600 mt-1">안전 상태</span>
                <span className="text-xs px-2 py-1 rounded text-white font-medium bg-safe mt-2">
                  {safetyLevel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary Info */}
        <div className="card bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-2">오늘 하루 안전 요약</h2>
              <p className="text-gray-800 leading-relaxed mb-4">
                오늘 하루 아이의 안전은 전반적으로 양호합니다. 오늘 1시 4분경 거실에서 넘어짐이 감지되었으나,
                이후 안정적으로 회복되었습니다.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="w-4 h-4 text-primary-600" />
                  <span>발생 시간: <strong>09:00-23:00</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span>사고 발생: <strong>{data.summary.total_incidents}건</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Checklist */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">안전 체크리스트</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChecklistItem
            title="안전 게이트 설치"
            checked={false}
            priority="high"
          />
          <ChecklistItem
            title="모서리 보호대 설치"
            checked={true}
            priority="high"
          />
          <ChecklistItem
            title="전기 콘센트 보호"
            checked={true}
            priority="high"
          />
          <ChecklistItem
            title="계단 안전문 확인"
            checked={true}
            priority="high"
          />
          <ChecklistItem
            title="작은 물건 정리"
            checked={true}
            priority="medium"
          />
          <ChecklistItem
            title="가구 고정 확인"
            checked={false}
            priority="medium"
          />
          <ChecklistItem
            title="세이프존 범위 재검토"
            checked={true}
            priority="low"
          />
        </div>
      </div>

      {/* Activity Pattern & Incident Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 24시간 활동 패턴 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">24시간 활동 패턴</h2>
          <div className="flex flex-col items-center justify-center py-8">
            <ClockChart />
            <div className="flex gap-6 text-sm mt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-safe rounded-full"></div>
                <span className="text-gray-700">안전 (90-100)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <span className="text-gray-700">주의 (70-89)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-danger rounded-full"></div>
                <span className="text-gray-700">위험 (0-69)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 사고 유형 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">사고 유형</h2>
            <AlertTriangle className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-80 w-80 mb-6">
              <IncidentPieChart data={data.incident_distribution} />
            </div>
            <div className="flex gap-6 text-sm">
              {data.incident_distribution
                .filter((item) => item.value > 0)
                .map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-700">{item.name}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Important Messages */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">주요 알림 메시지</h2>
        <div className="space-y-3">
          {importantMessages.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${message.color === 'red'
                  ? 'bg-danger-50 border-danger-500'
                  : 'bg-warning-50 border-warning-500'
                }`}
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{message.title}</h3>
              <p className="text-sm text-gray-700">{message.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Trend */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">안전도 추이</h2>
          <TrendingUp className="w-5 h-5 text-primary-600" />
        </div>
        <div className="h-64">
          <SafetyTrendChart
            data={data.weekly_trend.map((item) => ({
              day: item.date,
              score: item.safety,
              incidents: item.incidents,
            }))}
          />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">평균</p>
            <p className="text-base font-bold text-gray-900">{safetyScore}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">최고</p>
            <p className="text-base font-bold text-safe">
              {Math.max(...data.weekly_trend.map((d) => d.safety))}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">최저</p>
            <p className="text-base font-bold text-warning">
              {Math.min(...data.weekly_trend.map((d) => d.safety))}%
            </p>
          </div>
        </div>
      </div>

      {/* Safety Events Timeline */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">안전 이벤트 타임라인</h2>
        <div className="space-y-4">
          {recentEvents.map((event, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${event.type === 'success'
                      ? 'bg-safe'
                      : event.type === 'warning'
                        ? 'bg-warning'
                        : 'bg-danger'
                    }`}
                ></div>
                {index < recentEvents.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-semibold text-gray-900">{event.time}</span>
                  <span className="text-sm text-gray-700">{event.title}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Actions */}
      <div className="card bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">안전 조치 사항</h2>
        <div className="space-y-3">
          {safetyActions.map((action, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${action.priority === 'high'
                  ? 'bg-danger-50 border-danger-500'
                  : 'bg-warning-50 border-warning-500'
                }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={`w-5 h-5 ${action.priority === 'high' ? 'text-danger' : 'text-warning'
                    }`}
                />
                <span className="text-sm font-semibold text-gray-900">{action.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Clock Chart Component - 24시간 활동 패턴
function ClockChart() {
  // 목 데이터: 12시간 안전도 (1시간 단위, 손목시계 형식)
  const hourlySafety = [
    { hour: 0, safety: 95, incidents: 0 }, // 12시
    { hour: 1, safety: 98, incidents: 0 }, // 1시
    { hour: 2, safety: 99, incidents: 0 }, // 2시
    { hour: 3, safety: 98, incidents: 0 }, // 3시
    { hour: 4, safety: 97, incidents: 0 }, // 4시
    { hour: 5, safety: 96, incidents: 0 }, // 5시
    { hour: 6, safety: 94, incidents: 0 }, // 6시
    { hour: 7, safety: 92, incidents: 0 }, // 7시
    { hour: 8, safety: 90, incidents: 0 }, // 8시
    { hour: 9, safety: 88, incidents: 1 }, // 9시
    { hour: 10, safety: 85, incidents: 0 }, // 10시
    { hour: 11, safety: 82, incidents: 1 }, // 11시
  ]

  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const clockSize = 320
  const centerX = clockSize / 2
  const centerY = clockSize / 2
  const radius = 120

  const getSafetyColor = (safety: number) => {
    if (safety >= 90) return '#22c55e' // safe (green)
    if (safety >= 70) return '#f59e0b' // warning (yellow)
    return '#ef4444' // danger (red)
  }

  const getAngle = (hour: number) => {
    // 손목시계 형식: 12시가 위쪽, 시계 방향으로 회전
    // SVG 좌표계: 0도 = 오른쪽(3시), 90도 = 아래쪽(6시), 180도 = 왼쪽(9시), 270도 = 위쪽(12시)
    // 시계 좌표계: 12시 = 위쪽 = 270도
    // 12시간 = 360도, 1시간 = 30도
    // 0시(12시)가 위로 오려면 270도 = -90도
    // 각도 계산: (hour * 30 - 90)도
    // hour=0: -90도=270도(위), hour=3: 0도(오른쪽), hour=6: 90도(아래), hour=9: 180도(왼쪽)
    return ((hour * 30 - 90) * Math.PI) / 180
  }

  const handleMouseEnter = (hour: number, event: React.MouseEvent) => {
    setHoveredHour(hour)
    setTooltipPosition({ x: event.clientX, y: event.clientY })
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredHour !== null) {
      setTooltipPosition({ x: event.clientX, y: event.clientY })
    }
  }

  const handleMouseLeave = () => {
    setHoveredHour(null)
  }

  const hoveredData = hoveredHour !== null ? hourlySafety[hoveredHour] : null

  return (
    <div className="relative">
      <svg
        width={clockSize}
        height={clockSize}
        className="transform rotate-0"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* 시계 외곽 원 */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 10}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        {/* 시간 표시 (12, 3, 6, 9시) - 큰 인덱스 */}
        {[0, 3, 6, 9].map((hour) => {
          const angle = getAngle(hour)
          const x1 = centerX + (radius + 8) * Math.cos(angle)
          const y1 = centerY + (radius + 8) * Math.sin(angle)
          const x2 = centerX + radius * Math.cos(angle)
          const y2 = centerY + radius * Math.sin(angle)

          return (
            <line
              key={hour}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#6b7280"
              strokeWidth="3"
            />
          )
        })}

        {/* 시간 표시 (나머지 시간) - 작은 인덱스 */}
        {[1, 2, 4, 5, 7, 8, 10, 11].map((hour) => {
          const angle = getAngle(hour)
          const x1 = centerX + (radius + 5) * Math.cos(angle)
          const y1 = centerY + (radius + 5) * Math.sin(angle)
          const x2 = centerX + (radius - 5) * Math.cos(angle)
          const y2 = centerY + (radius - 5) * Math.sin(angle)

          return (
            <line
              key={hour}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#9ca3af"
              strokeWidth="2"
            />
          )
        })}

        {/* 각 시간대의 안전도 표시 (시계 인덱스처럼 표시, 크게) */}
        {hourlySafety.map((data) => {
          const angle = getAngle(data.hour)
          // 원쪽에 가깝게 배치 (radius의 80% 정도 위치에서 시작)
          const indexStartRadius = radius * 0.80
          const indexEndRadius = radius * 0.98
          const x1 = centerX + indexStartRadius * Math.cos(angle)
          const y1 = centerY + indexStartRadius * Math.sin(angle)
          const x2 = centerX + indexEndRadius * Math.cos(angle)
          const y2 = centerY + indexEndRadius * Math.sin(angle)
          const color = getSafetyColor(data.safety)

          return (
            <line
              key={data.hour}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              opacity={hoveredHour === null || hoveredHour === data.hour ? 1 : 0.5}
              onMouseEnter={(e) => handleMouseEnter(data.hour, e)}
              style={{ cursor: 'pointer' }}
              className="transition-opacity"
            />
          )
        })}

        {/* 중심 원 */}
        <circle cx={centerX} cy={centerY} r="8" fill="#6b7280" />
      </svg>

      {/* 툴팁 */}
      {hoveredData && hoveredHour !== null && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-semibold mb-1">
            {hoveredHour === 0 ? '12' : hoveredHour}시
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getSafetyColor(hoveredData.safety) }}
            ></div>
            <span>안전도: {hoveredData.safety}점</span>
          </div>
          {hoveredData.incidents > 0 && (
            <div className="text-xs text-warning mt-1">
              사고: {hoveredData.incidents}건
            </div>
          )}
        </div>
      )}

      {/* 시간 레이블 (12, 3, 6, 9시) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-full h-full">
          {[0, 3, 6, 9].map((hour) => {
            const angle = getAngle(hour)
            const labelRadius = radius + 30
            const x = centerX + labelRadius * Math.cos(angle)
            const y = centerY + labelRadius * Math.sin(angle)

            return (
              <div
                key={hour}
                className="absolute text-sm font-bold text-gray-700 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                }}
              >
                {hour === 0 ? '12' : hour}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Checklist Item Component
function ChecklistItem({
  title,
  checked,
  priority,
}: {
  title: string
  checked: boolean
  priority: 'high' | 'medium' | 'low'
}) {
  const priorityColors = {
    high: 'border-danger-500',
    medium: 'border-warning-500',
    low: 'border-gray-300',
  }

  return (
    <div
      className={`p-4 rounded-lg border-l-4 ${checked ? 'bg-gray-50' : 'bg-white'
        } ${priorityColors[priority]} border`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${checked ? 'bg-safe' : 'bg-gray-200'
            }`}
        >
          {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
        </div>
        <div className="flex-1">
          <p
            className={`text-sm font-semibold ${checked ? 'text-gray-600 line-through' : 'text-gray-900'
              }`}
          >
            {title}
          </p>
        </div>
        {priority === 'high' && (
          <span className="text-xs px-2 py-1 rounded text-white font-medium bg-danger">
            긴급
          </span>
        )}
        {priority === 'medium' && (
          <span className="text-xs px-2 py-1 rounded text-white font-medium bg-warning">
            권장
          </span>
        )}
        {priority === 'low' && (
          <span className="text-xs px-2 py-1 rounded text-white font-medium bg-gray-400">
            선택
          </span>
        )}
      </div>
    </div>
  )
}
