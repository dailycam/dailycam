import { useState, useEffect } from 'react'
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
  ChevronLeft,
} from 'lucide-react'
import { motion } from 'motion/react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getDashboardData, type DashboardData } from '../lib/api'
import { mockDashboardData } from '../utils/mockData'

type TimeRangeType = 'day' | 'week' | 'month' | 'year'

// 화면 너비를 감지하는 커스텀 훅
function useWindowWidth() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowWidth;
}

export default function Dashboard() {
  const windowWidth = useWindowWidth(); // 훅 호출
  const isMobile = windowWidth < 768;   // 모바일 화면 기준 설정 (768px 미만)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [timeRange, setTimeRange] = useState<TimeRangeType>('day')

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

  // 통합 타임라인 데이터 (발달 + 안전 이벤트)
  // 실제 데이터베이스에서 가져온 데이터 사용, 없으면 빈 배열
  const rawTimelineEvents = dashboardData?.timelineEvents || []

  // 수면 이벤트 그룹화 함수
  const groupSleepEvents = (events: any[]) => {
    // 수면 관련 이벤트 찾기
    const sleepEventIds = new Set<number>()
    const sleepEvents = events
      .map((e, idx) => ({ ...e, originalIndex: idx }))
      .filter((e, idx) => {
        const isSleep = e.isSleep ||
          e.title.includes('수면') ||
          e.title.includes('낮잠') ||
          (e.type === 'safety' && e.severity === 'info' && e.title.includes('수면'))
        if (isSleep) {
          sleepEventIds.add(idx)
        }
        return isSleep
      })
      .sort((a, b) => {
        // 시간순 정렬 (빠른 시간부터)
        const [aHour, aMin] = a.time.split(':').map(Number)
        const [bHour, bMin] = b.time.split(':').map(Number)
        return aHour * 60 + aMin - (bHour * 60 + bMin)
      })

    // 연속된 수면 이벤트 그룹화 (2시간 이내 간격이면 같은 그룹)
    const sleepGroups: any[][] = []
    let currentGroup: any[] = []

    sleepEvents.forEach((event) => {
      if (currentGroup.length === 0) {
        currentGroup.push(event)
      } else {
        const lastEvent = currentGroup[currentGroup.length - 1]
        const [lastHour, lastMin] = lastEvent.time.split(':').map(Number)
        const [currHour, currMin] = event.time.split(':').map(Number)
        const lastMinutes = lastHour * 60 + lastMin
        const currMinutes = currHour * 60 + currMin

        // 2시간 이내 간격이면 같은 그룹
        if (currMinutes - lastMinutes <= 120) {
          currentGroup.push(event)
        } else {
          sleepGroups.push([...currentGroup])
          currentGroup = [event]
        }
      }
    })

    if (currentGroup.length > 0) {
      sleepGroups.push(currentGroup)
    }

    // 수면 그룹을 하나의 이벤트로 변환
    const sleepGroupEvents: any[] = []
    sleepGroups.forEach(group => {
      const startEvent = group[0]
      const [startHour, startMin] = startEvent.time.split(':').map(Number)

      // 종료 시간 계산
      let finalEndHour = startHour
      let finalEndMin = startMin

      // 낮잠 이벤트가 있으면 그 시간을 기준으로 종료 시간 계산
      const napEvent = group.find((e: any) => e.title.includes('낮잠'))
      if (napEvent) {
        const [napHour, napMin] = napEvent.time.split(':').map(Number)
        const napTimeMatch = napEvent.title.match(/\((\d+)시간?\)/)
        if (napTimeMatch) {
          // 낮잠 지속 시간을 더해서 종료 시간 계산
          const napDuration = parseInt(napTimeMatch[1])
          finalEndHour = napHour + napDuration
          finalEndMin = napMin
        } else {
          // 낮잠 이벤트의 시간 + 1시간
          finalEndHour = napHour + 1
          finalEndMin = napMin
        }
      } else {
        // 마지막 수면 이벤트 시간 + 1시간
        const lastEvent = group[group.length - 1]
        const [lastHour, lastMin] = lastEvent.time.split(':').map(Number)
        finalEndHour = lastHour + 1
        finalEndMin = lastMin
      }

      // 시간 포맷팅
      const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
      const endTimeStr = `${finalEndHour.toString().padStart(2, '0')}:${finalEndMin.toString().padStart(2, '0')}`

      // 원본 이벤트와 가장 유사한 형태로 생성 (발달 카테고리 우선)
      const primaryEvent = group.find((e: any) => e.type === 'development') || group[0]

      sleepGroupEvents.push({
        ...primaryEvent,
        time: startEvent.time,
        hour: startEvent.hour,
        title: `${startTimeStr}~${endTimeStr}까지 수면했습니다`,
        description: '',
        isSleepGroup: true,
        sleepStartTime: startTimeStr,
        sleepEndTime: endTimeStr,
        sleepGroupMembers: group.map((e: any) => e.originalIndex)
      })
    })

    // 수면 그룹에 포함된 원본 이벤트들의 인덱스
    const usedSleepIndices = new Set<number>()
    sleepGroups.forEach(group => {
      group.forEach((e: any) => usedSleepIndices.add(e.originalIndex))
    })

    // 수면 그룹 이벤트 + 수면이 아닌 이벤트들 합치기
    const processedEvents = [
      ...sleepGroupEvents,
      ...events.filter((_, idx) => !usedSleepIndices.has(idx))
    ]

    // 시간순 정렬 (최신순)
    return processedEvents.sort((a, b) => {
      const [aHour, aMin] = a.time.split(':').map(Number)
      const [bHour, bMin] = b.time.split(':').map(Number)
      return bHour * 60 + bMin - (aHour * 60 + aMin)
    })
  }

  const timelineEvents = groupSleepEvents(rawTimelineEvents)

  const dayTimeRanges = [
    { start: 4, end: 7, label: '04시~07시' },
    { start: 8, end: 11, label: '08시~11시' },
    { start: 12, end: 15, label: '12시~15시' },
    { start: 16, end: 19, label: '16시~19시' },
    { start: 20, end: 23, label: '20시~23시' },
    { start: 0, end: 3, label: '00시~03시' },
  ]

  // 기간별 데이터 생성 함수
  const generateChartData = () => {
    if (timeRange === 'day') {
      const baseSafetyScore = dashboardData?.safetyScore ?? 90
      const baseDevelopmentScore = 92

      return dayTimeRanges.map(range => {
        const eventsInRange = timelineEvents.filter(e => {
          const eventHour = e.hour
          return eventHour >= range.start && eventHour <= range.end
        })

        const developmentEvents = eventsInRange.filter(e => e.type === 'development')
        const safetyEvents = eventsInRange.filter(e => e.type === 'safety')

        let developmentScore = baseDevelopmentScore
        developmentEvents.forEach(() => {
          developmentScore += 2
        })
        safetyEvents.forEach(event => {
          if (event.severity === 'warning') {
            developmentScore -= 1
          }
        })

        let safetyScore = baseSafetyScore
        safetyEvents.forEach(event => {
          if (event.severity === 'info') {
            safetyScore += 1
          } else if (event.severity === 'warning') {
            safetyScore -= 3
          }
        })

        developmentScore = Math.max(70, Math.min(100, developmentScore))
        safetyScore = Math.max(70, Math.min(100, safetyScore))

        return {
          time: range.label,
          startHour: range.start,
          endHour: range.end,
          safety: safetyScore,
          development: developmentScore,
        }
      })
    } else if (timeRange === 'week') {
      // 7일: 일자별 평균
      const baseSafetyScore = dashboardData?.safetyScore ?? 90
      const baseDevelopmentScore = 92

      return Array.from({ length: 7 }, (_, i) => {
        const day = i + 1
        // 일자별로 점수 변동 시뮬레이션 (실제로는 해당 일자의 데이터를 집계해야 함)
        const dayVariation = Math.sin((day / 7) * Math.PI * 2) * 10
        const safetyScore = Math.max(70, Math.min(100, baseSafetyScore + dayVariation))
        const developmentScore = Math.max(70, Math.min(100, baseDevelopmentScore + dayVariation * 0.8))

        return {
          time: `${day}일차`,
          day: day,
          safety: Math.round(safetyScore),
          development: Math.round(developmentScore),
        }
      })
    } else if (timeRange === 'month') {
      // 한달: 5일 단위로 묶어서 표시 (1~5일, 6~10일, 11~15일, 16~20일, 21~25일, 26~30일)
      const baseSafetyScore = dashboardData?.safetyScore ?? 90
      const baseDevelopmentScore = 92

      const ranges = [
        { start: 1, end: 5, label: '1~5일' },
        { start: 6, end: 10, label: '6~10일' },
        { start: 11, end: 15, label: '11~15일' },
        { start: 16, end: 20, label: '16~20일' },
        { start: 21, end: 25, label: '21~25일' },
        { start: 26, end: 30, label: '26~30일' },
      ]

      return ranges.map((range, idx) => {
        // 각 구간별로 점수 변동 시뮬레이션
        const rangeVariation = Math.sin((idx / ranges.length) * Math.PI * 2) * 8
        const safetyScore = Math.max(70, Math.min(100, baseSafetyScore + rangeVariation))
        const developmentScore = Math.max(70, Math.min(100, baseDevelopmentScore + rangeVariation * 0.8))

        return {
          time: range.label,
          startDay: range.start,
          endDay: range.end,
          safety: Math.round(safetyScore),
          development: Math.round(developmentScore),
        }
      })
    } else {
      // 1년: 달별
      const baseSafetyScore = dashboardData?.safetyScore ?? 90
      const baseDevelopmentScore = 92
      const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

      return months.map((month, i) => {
        // 달별로 점수 변동 시뮬레이션
        const monthVariation = Math.sin((i / 12) * Math.PI * 2) * 6
        const safetyScore = Math.max(70, Math.min(100, baseSafetyScore + monthVariation))
        const developmentScore = Math.max(70, Math.min(100, baseDevelopmentScore + monthVariation * 0.8))

        return {
          time: month,
          month: i + 1,
          safety: Math.round(safetyScore),
          development: Math.round(developmentScore),
        }
      })
    }
  }

  const chartData = generateChartData()

  const sectionTitleClass = 'text-xl font-semibold'

  // 시간 구간 생성 (테이블용 - 하루일 때만 사용)
  const timeRanges = timeRange === 'day' ? dayTimeRanges : []

  const stats = [
    {
      label: '안전 점수',
      value: (dashboardData?.safetyScore ?? 0).toString(),
      unit: '점',
      change: '+3',
      changeLabel: '지난주 대비',
      icon: Shield,
      color: 'text-safe',
      bgColor: 'bg-safe-50',
      trend: 'up'
    },
    {
      label: '발달 점수',
      value: (dashboardData?.developmentScore ?? 0).toString(),
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
      value: (dashboardData?.monitoringHours ?? 0).toFixed(1),
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
      value: (dashboardData?.incidentCount ?? 0).toString(),
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

      {/* 오늘의 하이라이트 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`${sectionTitleClass} font-bold`}>오늘의 하이라이트</h2>
            <p className="text-sm text-gray-500">AI가 분석한 지수의 하루</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          {dashboardData.recommendations && dashboardData.recommendations.length > 0 ? (
            dashboardData.recommendations.map((rec, index) => {
              // priority에 따른 배경색 설정
              const bgColorMap: Record<string, string> = {
                high: 'bg-[#FFE6E6]',      // 빨간색 계열
                medium: 'bg-[#E6F2FF]',    // 파란색 계열
                low: 'bg-[#E6FFE6]',       // 초록색 계열
              }
              const bgColor = bgColorMap[rec.priority] || 'bg-[#E6F2FF]'

              return (
                <div key={index} className={`card p-6 border-0 shadow-sm ${bgColor}`}>
                  <h3 className="text-lg font-semibold mb-2">{rec.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              )
            })
          ) : (
            // 데이터가 없을 때 기본 메시지
            <>
              <div className="card p-6 border-0 shadow-sm bg-[#E6F2FF]">
                <h3 className="text-lg font-semibold mb-2">분석을 시작해보세요</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  영상을 업로드하면 AI가 분석 결과를 제공합니다.
                </p>
              </div>
            </>
          )}
        </div>

        {/* CTA 버튼 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <a
            href="/development-report"
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white h-14 rounded-lg flex items-center justify-center font-medium transition-colors hover:from-primary-600 hover:to-primary-700"
          >
            발달 리포트 자세히 보기
            <ChevronRight className="w-5 h-5 ml-1" />
          </a>
          <a
            href="/safety-report"
            className="w-full bg-gradient-to-r from-safe to-safe-dark text-white h-14 rounded-lg flex items-center justify-center font-medium transition-colors hover:from-safe-dark hover:to-green-700"
          >
            안전 리포트 자세히 보기
            <ChevronRight className="w-5 h-5 ml-1" />
          </a>
        </div>
      </motion.div>

      {/* 오늘의 활동 타임라인 (시간-점수 차트) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mb-8"
      >
        <div className="card p-6 border-0 shadow-sm">
          {/* 헤더 */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-primary-500" />
              <div>
                <h2 className={sectionTitleClass}>오늘의 활동 타임라인</h2>
                <p className="text-sm text-gray-500">
                  {timeRange === 'day' ? '시간별 발달 및 안전 점수 추이' :
                    timeRange === 'week' ? '7일간 발달 및 안전 점수 추이' :
                      timeRange === 'month' ? '한달간 발달 및 안전 점수 추이' :
                        '연간 발달 및 안전 점수 추이'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* 기간 선택 버튼 */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTimeRange('day')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === 'day'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  하루
                </button>
                <button
                  onClick={() => setTimeRange('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === 'week'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  7일
                </button>
                <button
                  onClick={() => setTimeRange('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === 'month'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  한달
                </button>
                <button
                  onClick={() => setTimeRange('year')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === 'year'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  1년
                </button>
              </div>

              {/* 날짜 네비게이션 (하루일 때만 표시) */}
              {timeRange === 'day' && (
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
              )}
            </div>
          </div>

          {/* 시간-점수 차트 */}
          <div>
            <div className="flex items-center justify-end gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-safe"></div>
                <span className="text-gray-600">안전 점수</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-400"></div>
                <span className="text-gray-600">발달 점수</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: timeRange === 'year' ? 40 : 60 }}>
                <defs>
                  <linearGradient id="colorSafetyDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#86efac" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#86efac" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDevelopmentDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  interval={isMobile ? 'preserveEnd' : 0}
                  angle={timeRange === 'year' || timeRange === 'month' ? -45 : -45}
                  textAnchor="end"
                  height={timeRange === 'year' || timeRange === 'month' ? 80 : 60}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  domain={[70, 100]}
                  label={{ value: '점수', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9ca3af' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: any) => `${value}점`}
                  labelFormatter={(label) =>
                    timeRange === 'day' ? `시간 구간: ${label}` :
                      timeRange === 'week' ? `${label}` :
                        timeRange === 'month' ? `${label}` :
                          `${label}`
                  }
                />
                <Area
                  type="monotone"
                  dataKey="safety"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorSafetyDaily)"
                  animationDuration={1500}
                  name="안전 점수"
                />
                <Area
                  type="monotone"
                  dataKey="development"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#colorDevelopmentDaily)"
                  animationDuration={1500}
                  name="발달 점수"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 활동 타임라인 테이블 (하루일 때만 표시) */}
          {timeRange === 'day' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className={`${sectionTitleClass} flex items-center gap-2 text-gray-900 mb-4`}>
                <Activity className="w-5 h-5 text-primary-500" />
                활동 상세 내역
              </h3>

              {/* --- 기존 테이블: 데스크톱 화면용 --- */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 sticky left-0 bg-white z-10">
                        카테고리
                      </th>
                      {timeRanges.map((range) => (
                        <th
                          key={`${range.start}-${range.end}`}
                          className="text-center py-3 px-3 text-xs font-semibold text-gray-700 min-w-[120px]"
                        >
                          {range.label}
                        </th>
                      ))}
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
                      {timeRanges.map((range) => {
                        const eventsInRange = timelineEvents.filter(e =>
                          e.type === 'development' &&
                          e.hour >= range.start &&
                          e.hour <= range.end
                        )
                        return (
                          <td
                            key={`${range.start}-${range.end}`}
                            className="py-3 px-3 text-center align-top"
                          >
                            {eventsInRange.length > 0 ? (
                              <div className="space-y-2">
                                {eventsInRange.map((event, idx) => {
                                  // 수면 그룹이면 시간 표시 방식 다르게
                                  if (event.isSleepGroup) {
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <div className="text-xs font-medium text-gray-900">
                                          {event.title}
                                        </div>
                                        {event.hasClip && (
                                          <button className="mt-1 text-primary-600 hover:text-primary-700">
                                            <Video className="w-3 h-3 mx-auto" />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  }

                                  const [hours, minutes] = event.time.split(':')
                                  const timeStr = `${hours}시 ${minutes}분`
                                  return (
                                    <div key={idx} className="space-y-1">
                                      <div className="text-xs font-medium text-gray-900">
                                        {event.title}({timeStr})
                                      </div>
                                      {event.description && (
                                        <div className="text-xs text-primary-600">{event.description}</div>
                                      )}
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
                      })}
                    </tr>

                    {/* 안전 주의 행 */}
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-warning"></div>
                          안전 주의
                        </div>
                      </td>
                      {timeRanges.map((range) => {
                        const eventsInRange = timelineEvents.filter(e =>
                          e.type === 'safety' &&
                          e.severity === 'warning' &&
                          e.hour >= range.start &&
                          e.hour <= range.end
                        )
                        return (
                          <td
                            key={`${range.start}-${range.end}`}
                            className="py-3 px-3 text-center align-top"
                          >
                            {eventsInRange.length > 0 ? (
                              <div className="space-y-2">
                                {eventsInRange.map((event, idx) => {
                                  // 수면 그룹이면 시간 표시 방식 다르게
                                  if (event.isSleepGroup) {
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <div className="text-xs font-medium text-gray-900">
                                          {event.title}
                                        </div>
                                        {event.hasClip && (
                                          <button className="mt-1 text-primary-600 hover:text-primary-700">
                                            <Video className="w-3 h-3 mx-auto" />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  }

                                  const [hours, minutes] = event.time.split(':')
                                  const timeStr = `${hours}시 ${minutes}분`
                                  return (
                                    <div key={idx} className="space-y-1">
                                      <div className="text-xs font-medium text-gray-900">
                                        {event.title}({timeStr})
                                      </div>
                                      {event.description && (
                                        <div className="text-xs text-warning">{event.description}</div>
                                      )}
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
                      })}
                    </tr>

                    {/* 안전 위험 행 */}
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-danger"></div>
                          안전 위험
                        </div>
                      </td>
                      {timeRanges.map((range) => {
                        const eventsInRange = timelineEvents.filter(e =>
                          e.type === 'safety' &&
                          e.severity === 'danger' &&
                          e.hour >= range.start &&
                          e.hour <= range.end
                        )
                        return (
                          <td
                            key={`${range.start}-${range.end}`}
                            className="py-3 px-3 text-center align-top"
                          >
                            {eventsInRange.length > 0 ? (
                              <div className="space-y-2">
                                {eventsInRange.map((event, idx) => {
                                  // 수면 그룹이면 시간 표시 방식 다르게
                                  if (event.isSleepGroup) {
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <div className="text-xs font-medium text-gray-900">
                                          {event.title}
                                        </div>
                                      </div>
                                    )
                                  }

                                  const [hours, minutes] = event.time.split(':')
                                  const timeStr = `${hours}시 ${minutes}분`
                                  return (
                                    <div key={idx} className="space-y-1">
                                      <div className="text-xs font-medium text-gray-900">
                                        {event.title}({timeStr})
                                      </div>
                                      {event.description && (
                                        <div className="text-xs text-danger">{event.description}</div>
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
                      })}
                    </tr>

                    {/* 안전 권장 행 */}
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          안전 권장
                        </div>
                      </td>
                      {timeRanges.map((range) => {
                        const eventsInRange = timelineEvents.filter(e =>
                          e.type === 'safety' &&
                          e.severity === 'info' &&
                          e.category === '안전 권장' &&
                          e.hour >= range.start &&
                          e.hour <= range.end
                        )
                        return (
                          <td
                            key={`${range.start}-${range.end}`}
                            className="py-3 px-3 text-center align-top"
                          >
                            {eventsInRange.length > 0 ? (
                              <div className="space-y-2">
                                {eventsInRange.map((event, idx) => {
                                  // 수면 그룹이면 시간 표시 방식 다르게
                                  if (event.isSleepGroup) {
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <div className="text-xs font-medium text-gray-900">
                                          {event.title}
                                        </div>
                                      </div>
                                    )
                                  }

                                  const [hours, minutes] = event.time.split(':')
                                  const timeStr = `${hours}시 ${minutes}분`
                                  return (
                                    <div key={idx} className="space-y-1">
                                      <div className="text-xs font-medium text-gray-900">
                                        {event.title}({timeStr})
                                      </div>
                                      {event.description && (
                                        <div className="text-xs text-blue-500">{event.description}</div>
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
                      })}
                    </tr>

                    {/* 안전 확인 행 */}
                    <tr>
                      <td className="py-4 px-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-safe"></div>
                          안전 확인
                        </div>
                      </td>
                      {timeRanges.map((range) => {
                        const eventsInRange = timelineEvents.filter(e =>
                          e.type === 'safety' &&
                          e.severity === 'info' &&
                          e.category === '안전 확인' &&
                          e.hour >= range.start &&
                          e.hour <= range.end
                        )
                        return (
                          <td
                            key={`${range.start}-${range.end}`}
                            className="py-3 px-3 text-center align-top"
                          >
                            {eventsInRange.length > 0 ? (
                              <div className="space-y-2">
                                {eventsInRange.map((event, idx) => {
                                  // 수면 그룹이면 시간 표시 방식 다르게
                                  if (event.isSleepGroup) {
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <div className="text-xs font-medium text-gray-900">
                                          {event.title}
                                        </div>
                                        {event.resolved && (
                                          <CheckCircle2 className="w-3 h-3 text-safe mx-auto mt-1" />
                                        )}
                                      </div>
                                    )
                                  }

                                  const [hours, minutes] = event.time.split(':')
                                  const timeStr = `${hours}시 ${minutes}분`
                                  return (
                                    <div key={idx} className="space-y-1">
                                      <div className="text-xs font-medium text-gray-900">
                                        {event.title}({timeStr})
                                      </div>
                                      {event.description && (
                                        <div className="text-xs text-safe">{event.description}</div>
                                      )}
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
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* --- 새로운 카드 리스트: 모바일 화면용 --- */}
              <div className="block lg:hidden space-y-4">
                {timeRanges.map((range) => {
                  const eventsInRange = timelineEvents.filter(e =>
                    e.hour >= range.start && e.hour <= range.end
                  );

                  if (eventsInRange.length === 0) {
                    return null; // 해당 시간대에 이벤트가 없으면 렌더링하지 않음
                  }

                  return (
                    <div key={range.label} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                      <h4 className="font-bold text-primary-600 mb-3 pb-2 border-b">{range.label}</h4>
                      <div className="space-y-3">
                        {eventsInRange.map((event, idx) => {
                          const Icon = event.type === 'development' ? Baby : Shield;
                          const iconColor = event.type === 'development'
                            ? 'text-blue-500'
                            : event.severity === 'warning'
                              ? 'text-yellow-500'
                              : 'text-green-500';

                          return (
                            <div key={idx}>
                              <div className="flex items-start gap-3">
                                <Icon className={`w-4 h-4 mt-1 ${iconColor}`} />
                                <div className="flex-1">
                                  <p className="font-semibold text-sm text-gray-800">{event.title}</p>
                                  <p className="text-xs text-gray-600">{event.description}</p>
                                  <p className="text-xs text-gray-400 mt-1">{event.time}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>

    </div>
  )
}
