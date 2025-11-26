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
  Baby,
  Eye,
  Video,
  ChevronRight,
  Sparkles,
  ChevronLeft,
  MoreVertical,
} from 'lucide-react'
import { motion } from 'motion/react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'
import { getDashboardData, type DashboardData } from '../lib/api'
import { mockDashboardData } from '../utils/mockData'

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const dashboard = await getDashboardData(7)
        setDashboardData(dashboard)
      } catch (err: any) {
        console.error('대시보드 데이터 로딩 오류:', err)
        setDashboardData(mockDashboardData)
        setError(null)
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
    : []

  // 주간 트렌드 데이터 (안전도 + 발달 점수 시뮬레이션)
  const weeklyTrendData = [
    { day: '월', safety: dashboardData.weeklyTrend[0]?.score || 88, development: 75 },
    { day: '화', safety: dashboardData.weeklyTrend[1]?.score || 90, development: 78 },
    { day: '수', safety: dashboardData.weeklyTrend[2]?.score || 87, development: 82 },
    { day: '목', safety: dashboardData.weeklyTrend[3]?.score || 92, development: 85 },
    { day: '금', safety: dashboardData.weeklyTrend[4]?.score || 91, development: 88 },
    { day: '토', safety: dashboardData.weeklyTrend[5]?.score || 93, development: 90 },
    { day: '일', safety: dashboardData.weeklyTrend[6]?.score || 92, development: 92 },
  ]

  // 시간별 트렌드 데이터
  const hourlyData = [
    { time: '00:00', safety: 98, development: 85 },
    { time: '02:00', safety: 98, development: 85 },
    { time: '04:00', safety: 97, development: 85 },
    { time: '06:00', safety: 95, development: 82 },
    { time: '08:00', safety: 93, development: 80 },
    { time: '10:00', safety: 91, development: 85 },
    { time: '12:00', safety: 88, development: 88 },
    { time: '14:00', safety: 85, development: 92 },
    { time: '16:00', safety: 90, development: 95 },
    { time: '18:00', safety: 92, development: 90 },
    { time: '20:00', safety: 95, development: 88 },
    { time: '22:00', safety: 97, development: 86 },
  ]

  // 통합 타임라인 데이터 (발달 + 안전 이벤트)
  const timelineEvents = [
    { 
      time: '15:00', 
      hour: 15,
      type: 'development',
      icon: '🤸',
      title: '배밀이 연습 (15분)', 
      description: '대근육 발달 촉진',
      hasClip: true,
      category: '운동 발달'
    },
    { 
      time: '13:45', 
      hour: 13,
      type: 'safety',
      severity: 'warning',
      icon: '⚠️',
      title: '침대 가장자리 접근',
      description: '아기가 침대 가장자리에 접근했습니다. 안전 패드 확인을 권장합니다.',
      resolved: true,
      hasClip: true,
      category: '안전 주의'
    },
    { 
      time: '13:00', 
      hour: 13,
      type: 'development',
      icon: '🍼',
      title: '점심 수유 및 놀이', 
      description: '손 운동 능력 발달',
      hasClip: false,
      category: '신체 발달'
    },
    { 
      time: '11:20', 
      hour: 11,
      type: 'safety',
      severity: 'warning',
      icon: '👀',
      title: '비정상적인 움직임',
      description: '평소보다 활발한 움직임이 감지되었습니다.',
      resolved: true,
      hasClip: false,
      category: '안전 주의'
    },
    { 
      time: '10:30', 
      hour: 10,
      type: 'development',
      icon: '💤',
      title: '낮잠 (1시간)', 
      description: '안정적인 수면 패턴',
      hasClip: false,
      category: '생활 리듬'
    },
    { 
      time: '09:00', 
      hour: 9,
      type: 'development',
      icon: '🎨',
      title: '놀이 시간 (20분)', 
      description: '시각 추적 능력 향상',
      hasClip: true,
      category: '인지 발달'
    },
    { 
      time: '08:30', 
      hour: 8,
      type: 'safety',
      severity: 'info',
      icon: '😴',
      title: '안전한 수면 자세',
      description: '바른 자세로 수면 중입니다.',
      resolved: true,
      hasClip: false,
      category: '안전 확인'
    },
    { 
      time: '07:30', 
      hour: 7,
      type: 'development',
      icon: '🌅',
      title: '기상 및 아침 수유', 
      description: '규칙적인 생활 리듬',
      hasClip: false,
      category: '생활 리듬'
    },
    { 
      time: '06:00', 
      hour: 6,
      type: 'safety',
      severity: 'info',
      icon: '🌅',
      title: '기상',
      description: '정상적으로 기상했습니다.',
      resolved: true,
      hasClip: false,
      category: '안전 확인'
    },
  ]

  const stats = [
    { 
      label: '안전 점수',
      value: dashboardData.safetyScore.toString(),
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
      value: dashboardData.monitoringHours.toString(),
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
      value: dashboardData.incidentCount.toString(),
      unit: '건',
      change: '2건 주의',
      changeLabel: '모두 해결됨',
      icon: Activity,
      color: 'text-warning',
      bgColor: 'bg-warning-50',
      trend: 'neutral'
    },
  ]

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Hero Section - 감성적 인사말 */}
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
            오늘 하루도 건강하고 안전하게 보냈어요. 특히 배밀이 연습에서 큰 진전을 보였답니다 🎉
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mb-8"
      >
        <div className="card p-6 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl mb-1">주간 트렌드</h2>
              <p className="text-sm text-gray-500">최근 7일간 안전 및 발달 점수 추이</p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                <span className="text-gray-600">안전</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-400"></div>
                <span className="text-gray-600">발달</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSafety" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDevelopment" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} domain={[70, 100]} />
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
                dataKey="safety" 
                stroke="#0284c7" 
                strokeWidth={2}
                fill="url(#colorSafety)" 
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="development" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                fill="url(#colorDevelopment)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 오늘의 활동 및 이벤트 타임라인 (테이블 형식) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mb-8"
      >
        <div className="card p-6 border-0 shadow-sm">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-primary-500" />
              <div>
                <h2 className="text-xl">오늘의 활동 타임라인</h2>
                <p className="text-sm text-gray-500">발달 활동 및 안전 이벤트 전체 현황</p>
              </div>
            </div>
            
            {/* 날짜 네비게이션 */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const prevDate = new Date(selectedDate)
                  prevDate.setDate(prevDate.getDate() - 1)
                  setSelectedDate(prevDate)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                {selectedDate.toLocaleDateString('ko-KR', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit',
                  weekday: 'short'
                })}
              </div>
              <button
                onClick={() => {
                  const nextDate = new Date(selectedDate)
                  nextDate.setDate(nextDate.getDate() + 1)
                  // 오늘 이후로는 이동 불가
                  if (nextDate <= new Date()) {
                    setSelectedDate(nextDate)
                  }
                }}
                disabled={selectedDate >= new Date()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 sticky left-0 bg-white z-10">
                    카테고리
                  </th>
                  {(() => {
                    // 이벤트가 있는 시간대만 추출하고 정렬 (최신순)
                    const hoursWithEvents = Array.from(new Set(timelineEvents.map(e => e.hour)))
                      .sort((a, b) => b - a) // 최신순
                    
                    return hoursWithEvents.map((hour) => {
                      // 시간 표시 형식: 오전/오후 형식
                      let hourDisplay = ''
                      if (hour === 0) {
                        hourDisplay = '12시/00시'
                      } else if (hour === 12) {
                        hourDisplay = '12시/00시'
                      } else if (hour < 12) {
                        // 오전: 1시 → "1시/13시", 2시 → "2시/14시"
                        hourDisplay = `${hour}시/${hour + 12}시`
                      } else {
                        // 오후: 13시 → "1시/13시", 14시 → "2시/14시", 15시 → "3시/15시"
                        hourDisplay = `${hour - 12}시/${hour}시`
                      }
                      
                      return (
                        <th
                          key={hour}
                          className="text-center py-3 px-3 text-xs font-semibold text-gray-700 min-w-[100px]"
                        >
                          {hourDisplay}
                        </th>
                      )
                    })
                  })()}
                </tr>
              </thead>
              <tbody>
                {/* 발달 행 */}
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                      발달
                    </div>
                  </td>
                  {(() => {
                    // 헤더와 동일한 시간대 순서 사용
                    const hoursWithEvents = Array.from(new Set(timelineEvents.map(e => e.hour)))
                      .sort((a, b) => b - a) // 최신순
                    
                    return hoursWithEvents.map((hour) => {
                      const eventsInHour = timelineEvents.filter(e => e.hour === hour && e.type === 'development')
                      return (
                        <td
                          key={hour}
                          className="py-3 px-3 text-center align-top"
                        >
                          {eventsInHour.length > 0 ? (
                            <div className="space-y-2">
                              {eventsInHour.map((event, idx) => {
                                const [hours, minutes] = event.time.split(':')
                                const timeStr = `${hours}시 ${minutes}분`
                                return (
                                  <div key={idx} className="space-y-1">
                                    <div className="text-2xl mb-1">{event.icon}</div>
                                    <div className="text-xs font-medium text-gray-900">
                                      {event.title}({timeStr})
                                    </div>
                                    <div className="text-xs text-gray-600">{event.description}</div>
                                    {event.hasClip && (
                                      <button className="mt-1 text-primary-600 hover:text-primary-700">
                                        <Video className="w-3 h-3 mx-auto" />
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">-</div>
                          )}
                        </td>
                      )
                    })
                  })()}
                </tr>

                {/* 안전 주의 행 */}
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-warning"></div>
                      안전 주의
                    </div>
                  </td>
                  {(() => {
                    const hoursWithEvents = Array.from(new Set(timelineEvents.map(e => e.hour)))
                      .sort((a, b) => b - a)
                    
                    return hoursWithEvents.map((hour) => {
                      const eventsInHour = timelineEvents.filter(e => e.hour === hour && e.type === 'safety' && e.severity === 'warning')
                      return (
                        <td
                          key={hour}
                          className="py-3 px-3 text-center align-top"
                        >
                          {eventsInHour.length > 0 ? (
                            <div className="space-y-2">
                              {eventsInHour.map((event, idx) => {
                                const [hours, minutes] = event.time.split(':')
                                const timeStr = `${hours}시 ${minutes}분`
                                return (
                                  <div key={idx} className="space-y-1">
                                    <div className="text-2xl mb-1">{event.icon}</div>
                                    <div className="text-xs font-medium text-gray-900">
                                      {event.title}({timeStr})
                                    </div>
                                    <div className="text-xs text-gray-600">{event.description}</div>
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                      {event.resolved && (
                                        <CheckCircle2 className="w-3 h-3 text-safe" />
                                      )}
                                      {event.hasClip && (
                                        <button className="text-primary-600 hover:text-primary-700">
                                          <Video className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">-</div>
                          )}
                        </td>
                      )
                    })
                  })()}
                </tr>

                {/* 안전 위험 행 */}
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-danger"></div>
                      안전 위험
                    </div>
                  </td>
                  {(() => {
                    const hoursWithEvents = Array.from(new Set(timelineEvents.map(e => e.hour)))
                      .sort((a, b) => b - a)
                    
                    return hoursWithEvents.map((hour) => {
                      const eventsInHour = timelineEvents.filter(e => e.hour === hour && e.type === 'safety' && e.severity === 'danger')
                      return (
                        <td
                          key={hour}
                          className="py-3 px-3 text-center align-top"
                        >
                          {eventsInHour.length > 0 ? (
                            <div className="space-y-2">
                              {eventsInHour.map((event, idx) => {
                                const [hours, minutes] = event.time.split(':')
                                const timeStr = `${hours}시 ${minutes}분`
                                return (
                                  <div key={idx} className="space-y-1">
                                    <div className="text-2xl mb-1">{event.icon}</div>
                                    <div className="text-xs font-medium text-gray-900">
                                      {event.title}({timeStr})
                                    </div>
                                    <div className="text-xs text-gray-600">{event.description}</div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">-</div>
                          )}
                        </td>
                      )
                    })
                  })()}
                </tr>

                {/* 안전 권장 행 */}
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      안전 권장
                    </div>
                  </td>
                  {(() => {
                    const hoursWithEvents = Array.from(new Set(timelineEvents.map(e => e.hour)))
                      .sort((a, b) => b - a)
                    
                    return hoursWithEvents.map((hour) => {
                      const eventsInHour = timelineEvents.filter(e => e.hour === hour && e.type === 'safety' && e.severity === 'info' && e.category === '안전 권장')
                      return (
                        <td
                          key={hour}
                          className="py-3 px-3 text-center align-top"
                        >
                          {eventsInHour.length > 0 ? (
                            <div className="space-y-2">
                              {eventsInHour.map((event, idx) => {
                                const [hours, minutes] = event.time.split(':')
                                const timeStr = `${hours}시 ${minutes}분`
                                return (
                                  <div key={idx} className="space-y-1">
                                    <div className="text-2xl mb-1">{event.icon}</div>
                                    <div className="text-xs font-medium text-gray-900">
                                      {event.title}({timeStr})
                                    </div>
                                    <div className="text-xs text-gray-600">{event.description}</div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">-</div>
                          )}
                        </td>
                      )
                    })
                  })()}
                </tr>

                {/* 안전 확인 행 */}
                <tr>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-safe"></div>
                      안전 확인
                    </div>
                  </td>
                  {(() => {
                    const hoursWithEvents = Array.from(new Set(timelineEvents.map(e => e.hour)))
                      .sort((a, b) => b - a)
                    
                    return hoursWithEvents.map((hour) => {
                      const eventsInHour = timelineEvents.filter(e => e.hour === hour && e.type === 'safety' && e.severity === 'info' && e.category === '안전 확인')
                      return (
                        <td
                          key={hour}
                          className="py-3 px-3 text-center align-top"
                        >
                          {eventsInHour.length > 0 ? (
                            <div className="space-y-2">
                              {eventsInHour.map((event, idx) => {
                                const [hours, minutes] = event.time.split(':')
                                const timeStr = `${hours}시 ${minutes}분`
                                return (
                                  <div key={idx} className="space-y-1">
                                    <div className="text-2xl mb-1">{event.icon}</div>
                                    <div className="text-xs font-medium text-gray-900">
                                      {event.title}({timeStr})
                                    </div>
                                    <div className="text-xs text-gray-600">{event.description}</div>
                                    {event.resolved && (
                                      <CheckCircle2 className="w-3 h-3 text-safe mx-auto mt-1" />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">-</div>
                          )}
                        </td>
                      )
                    })
                  })()}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* 하이라이트 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl">오늘의 하이라이트</h2>
            <p className="text-sm text-gray-500">AI가 분석한 지수의 하루</p>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card p-6 border-0 shadow-sm bg-gradient-to-br from-primary-50 to-blue-50">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-lg mb-2">배밀이 2미터 성공!</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              오후 3시, 좋아하는 장난감을 향해 2미터나 배밀이로 이동했어요. 대근육 발달의 중요한 순간이에요!
            </p>
          </div>
          
          <div className="card p-6 border-0 shadow-sm bg-gradient-to-br from-primary-50 to-cyan-50">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-lg mb-2">옹알이 20% 증가</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              다양한 음절의 옹알이가 지난주보다 20% 늘었어요. 언어 발달이 빠르게 진행되고 있어요!
            </p>
          </div>
          
          <div className="card p-6 border-0 shadow-sm bg-gradient-to-br from-safe-50 to-green-50">
            <div className="text-4xl mb-3">🛡️</div>
            <h3 className="text-lg mb-2">안전한 하루</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              오늘 하루 2건의 주의 알림이 있었지만 모두 빠르게 해결되어 안전한 하루를 보냈어요.
            </p>
          </div>
        </div>
      </motion.div>

      {/* CTA 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="grid lg:grid-cols-2 gap-4"
      >
        <a 
          href="/development-report"
          className="w-full btn-primary flex items-center justify-center h-14 shadow-md"
        >
          발달 리포트 자세히 보기
          <ChevronRight className="w-5 h-5 ml-1" />
        </a>
        <a 
          href="/safety-report"
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md h-14 rounded-lg flex items-center justify-center font-medium transition-colors"
        >
          안전 리포트 자세히 보기
          <ChevronRight className="w-5 h-5 ml-1" />
        </a>
      </motion.div>
    </div>
  )
}
