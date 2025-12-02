import { useState, useEffect, useMemo } from 'react'
import { SimpleClockChart } from '../components/dashboard/SimpleClockChart'
import { ClockGaugeSection } from '../components/dashboard/ClockGaugeSection'
import { ActivityTable } from '../components/dashboard/ActivityTable'
import { StatsGrid } from '../components/dashboard/StatsGrid'
import { EventModal } from '../components/dashboard/EventModal'
import { getDashboardData } from '../lib/api'

interface TimelineEvent {
    time: string
    hour: number
    type: 'development' | 'safety'
    severity?: 'danger' | 'warning' | 'info'
    title: string
    description: string
    category?: string
    hasClip?: boolean
    thumbnailUrl?: string
    videoUrl?: string
}

interface MonitoringRange {
    start: string
    end: string
}

export const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours())

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getDashboardData()
                console.log('📦 [Dashboard] 받은 데이터:', data)
                setDashboardData(data)
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err)
                setError("데이터를 불러오는데 실패했습니다.")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // 타임라인 이벤트 데이터 준비
    const timelineEvents: TimelineEvent[] = useMemo(() => {
        if (!dashboardData?.timelineEvents) return []
        return dashboardData.timelineEvents.map((ev: any) => ({
            time: ev.time,
            hour: parseInt(ev.time.split(':')[0]),
            type: ev.type,
            severity: ev.severity,
            title: ev.title || '',
            description: ev.description || '',
            category: ev.category,
            hasClip: ev.hasClip,
            thumbnailUrl: ev.thumbnailUrl,
            videoUrl: ev.videoUrl
        }))
    }, [dashboardData])

    // 모니터링 구간 데이터 준비 (실제 이벤트 시간 기반)
    const monitoringRanges: MonitoringRange[] = useMemo(() => {
        if (timelineEvents.length === 0) return []

        // 이벤트를 시간순으로 정렬
        const sortedEvents = [...timelineEvents].sort((a, b) => a.time.localeCompare(b.time))

        // 가장 빠른 시간과 가장 늦은 시간 찾기
        const startTime = sortedEvents[0].time
        const endTime = sortedEvents[sortedEvents.length - 1].time

        return [{ start: startTime, end: endTime }]
    }, [timelineEvents])

    // 시간대별 통계 - 백엔드 데이터 우선 사용
    const hourlyStats = useMemo(() => {
        // 백엔드에서 hourlyStats를 받았다면 그대로 사용
        if (dashboardData?.hourlyStats && dashboardData.hourlyStats.length > 0) {
            console.log('✅ [Hourly Stats] 백엔드 데이터 사용:', dashboardData.hourlyStats)
            return dashboardData.hourlyStats
        }

        // 백엔드 데이터가 없으면 타임라인 이벤트로 계산 (평균 점수 로직 적용)
        console.log('⚠️ [Hourly Stats] 백엔드 데이터 없음, 타임라인으로 계산')

        // 중간 집계용 배열
        const tempStats = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            totalSafetyScore: 0,
            totalDevScore: 0,
            safetyCount: 0,
            devCount: 0,
            eventCount: 0
        }))

        timelineEvents.forEach(event => {
            const hour = parseInt(event.time.split(':')[0])
            if (hour >= 0 && hour < 24) {
                tempStats[hour].eventCount += 1

                if (event.type === 'safety') {
                    tempStats[hour].safetyCount += 1
                    // 이벤트 심각도에 따른 점수 부여
                    if (event.severity === 'danger') tempStats[hour].totalSafetyScore += 60
                    else if (event.severity === 'warning') tempStats[hour].totalSafetyScore += 80
                    else tempStats[hour].totalSafetyScore += 95
                } else if (event.type === 'development') {
                    tempStats[hour].devCount += 1
                    tempStats[hour].totalDevScore += 10 // 발달 이벤트는 가산점 (기본 로직 유지)
                }
            }
        })

        // 최종 평균 계산
        return tempStats.map(s => ({
            hour: s.hour,
            safetyScore: s.safetyCount > 0 ? Math.round(s.totalSafetyScore / s.safetyCount) : 100,
            developmentScore: s.devCount > 0 ? Math.min(100, 50 + s.totalDevScore) : 50, // 발달 점수는 기본 50 + 가산점
            eventCount: s.eventCount
        }))
    }, [timelineEvents, dashboardData])

    // 시계 데이터 생성 (24시간)
    const clockData = useMemo(() => {
        // hourlyStats가 있으면 그것을 기반으로 생성 (평균 점수 반영)
        if (hourlyStats && hourlyStats.length > 0) {
            return hourlyStats.map((stat: any) => {
                let safetyLevel: 'safe' | 'warning' | 'danger' | null = 'safe'
                if (stat.safetyScore < 70) safetyLevel = 'danger'
                else if (stat.safetyScore < 90) safetyLevel = 'warning'

                // 이벤트가 없으면 safe
                if (stat.eventCount === 0) safetyLevel = null

                return {
                    hour: stat.hour,
                    safetyLevel,
                    safetyScore: stat.safetyScore,
                    color: '',
                    incident: stat.eventCount > 0 ? `${stat.eventCount}건 감지` : ''
                }
            })
        }

        // 폴백 (혹시라도 hourlyStats가 없으면)
        const data = []
        for (let i = 0; i < 24; i++) {
            const hourEvents = timelineEvents.filter(e => parseInt(e.time.split(':')[0]) === i)

            let safetyLevel: 'safe' | 'warning' | 'danger' | null = null
            let incident = ''
            let score = 100

            if (hourEvents.length > 0) {
                if (hourEvents.some(e => e.severity === 'danger')) {
                    safetyLevel = 'danger'
                    incident = '위험 감지'
                    score = 60
                } else if (hourEvents.some(e => e.severity === 'warning')) {
                    safetyLevel = 'warning'
                    incident = '주의 필요'
                    score = 80
                } else {
                    safetyLevel = 'safe'
                    score = 95
                }
            }

            data.push({
                hour: i,
                safetyLevel,
                safetyScore: score,
                color: '',
                incident
            })
        }
        return data
    }, [timelineEvents, hourlyStats])

    // [수정] 백엔드에서 받은 실제 데이터 직접 사용
    const dailyStats = useMemo(() => {
        const currentHour = new Date().getHours()

        // 22시 이후면 초기화 (이 로직은 유지)
        if (currentHour >= 22) {
            return {
                safetyScore: 100,
                developmentScore: 50,
                monitoringHours: 0,
                incidentCount: 0
            }
        }

        // 백엔드에서 받은 데이터를 직접 사용
        console.log('📊 [Daily Stats] 백엔드 데이터 사용:', {
            safetyScore: dashboardData?.safetyScore,
            developmentScore: dashboardData?.developmentScore,
            monitoringHours: dashboardData?.monitoringHours,
            incidentCount: dashboardData?.incidentCount
        })

        return {
            safetyScore: dashboardData?.safetyScore || 100,
            developmentScore: dashboardData?.developmentScore || 50,
            monitoringHours: dashboardData?.monitoringHours || 0,
            incidentCount: dashboardData?.incidentCount || 0
        }
    }, [dashboardData])

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalEvents, setModalEvents] = useState<any[]>([])
    const [modalTimeRange, setModalTimeRange] = useState<string | null>(null)
    const [modalCategory, setModalCategory] = useState<string | null>(null)

    const handleEventClick = (events: any[], timeRange: string, category: string) => {
        setModalEvents(events)
        setModalTimeRange(timeRange)
        setModalCategory(category)
        setIsModalOpen(true)
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* 1. 상단: 카드 섹션 4개 (백엔드 실제 데이터) */}
            <StatsGrid
                safetyScore={dailyStats.safetyScore}
                developmentScore={dailyStats.developmentScore}
                monitoringHours={dailyStats.monitoringHours}
                incidentCount={dailyStats.incidentCount}
            />

            {/* 2. 중단: 통합 카드 (시계 + 통계 패널) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* 왼쪽: 시계 (5칸 차지) */}
                    <div className="col-span-5 flex flex-col items-center justify-center relative overflow-visible">
                        <SimpleClockChart
                            fullClockData={clockData}
                            events={timelineEvents}
                            monitoringRanges={monitoringRanges}
                            onHourClick={setSelectedHour}
                        />
                    </div>

                    {/* 오른쪽: 통계 패널 (6칸 차지, 7번째 칸부터 시작하여 가운데 1칸 공백 확보) */}
                    <div className="col-span-6 col-start-7">
                        <ClockGaugeSection
                            selectedHour={selectedHour}
                            hourlyStats={hourlyStats}
                        />
                    </div>
                </div>
            </div>

            {/* 3. 하단: 활동 로그 테이블 */}
            <ActivityTable
                timelineEvents={timelineEvents}
                onEventClick={handleEventClick}
            />

            {/* 이벤트 상세 모달 */}
            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                events={modalEvents}
                timeRange={modalTimeRange}
                category={modalCategory}
            />
        </div>
    )
}
