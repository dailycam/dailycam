import { Activity, Baby, Shield } from 'lucide-react'

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



interface ActivityTableProps {
    timelineEvents: TimelineEvent[]
    onEventClick: (events: any[], timeRange: string, category: string) => void
}

export const ActivityTable: React.FC<ActivityTableProps> = ({
    timelineEvents,
    onEventClick
}) => {
    // 24시간 배열 생성 (0시 ~ 23시)
    const hourlyRanges = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: `${i}시`
    }))
    // Helper: 우선순위 기반 이벤트 렌더링 (1개만 표시, 클릭 가능)
    const renderCellContent = (events: TimelineEvent[], timeRange: string, category: string) => {
        if (!events || events.length === 0) {
            return <div className="text-base text-gray-300 h-32 w-full flex items-center justify-center">-</div>
        }

        // 중요도 점수 매핑
        const severityScore: Record<string, number> = {
            danger: 3,
            warning: 2,
            info: 1
        }

        // 1. 중요도 순으로 정렬, 2. 같으면 시간 빠른 순
        const sortedEvents = [...events].sort((a, b) => {
            const scoreA = severityScore[a.severity || ''] || 0
            const scoreB = severityScore[b.severity || ''] || 0
            if (scoreB !== scoreA) return scoreB - scoreA

            // 시간 비교
            const [aHour, aMin] = a.time.split(':').map(Number)
            const [bHour, bMin] = b.time.split(':').map(Number)
            return (aHour * 60 + aMin) - (bHour * 60 + bMin)
        })

        const topEvent = sortedEvents[0]
        const moreCount = sortedEvents.length - 1

        const textColor = topEvent.severity === 'danger'
            ? 'text-danger-600 font-semibold'
            : topEvent.severity === 'warning'
                ? 'text-warning-600'
                : 'text-gray-700'

        const [hours, minutes] = topEvent.time.split(':')
        const timeStr = `${hours}:${minutes}`

        return (
            <div
                className="relative h-32 w-full flex flex-col items-center justify-center px-4 py-3 cursor-pointer hover:bg-gray-100/50 transition-all group"
                onClick={() => onEventClick(sortedEvents, timeRange, category)}
            >
                <div className="flex flex-col items-center gap-2 w-full">
                    {/* 제목 - 최대 2줄, 넘치면 ... */}
                    <div
                        className={`text-sm ${textColor} text-center leading-snug w-full line-clamp-2`}
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word'
                        }}
                    >
                        {topEvent.title}
                    </div>
                    {/* 시간 */}
                    <span className="text-xs text-gray-400 mt-0.5">{timeStr}</span>
                </div>

                {moreCount > 0 && (
                    <span className="absolute top-2 right-2 bg-primary-100 text-primary-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        +{moreCount}
                    </span>
                )}
            </div>
        )
    }

    return (
        <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-900 mb-4 section-title-accent">
                <Activity className="w-5 h-5 text-primary-500" />
                활동 상세 내역
            </h3>

            {/* 데스크톱 테이블 - 가로 스크롤 */}
            <div className="hidden lg:block overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full border-collapse bg-white" style={{ minWidth: '6500px' }}>
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-32 py-4 px-4 text-center text-sm font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200 sticky left-0 z-20 bg-gray-50 after:content-[''] after:absolute after:top-0 after:right-0 after:w-[1px] after:h-full after:bg-gray-200">
                                카테고리
                            </th>
                            {hourlyRanges.map((range) => (
                                <th
                                    key={range.hour}
                                    className="py-4 px-4 text-center text-sm font-semibold text-gray-600 border-r border-b border-gray-200 w-64"
                                >
                                    {range.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                        {/* 1. 발달 행 */}
                        <tr>
                            <td className="h-32 py-0 bg-gray-50 border-b border-gray-200 sticky left-0 z-20 after:content-[''] after:absolute after:top-0 after:right-0 after:w-[1px] after:h-full after:bg-gray-200">
                                <div className="flex flex-col items-center justify-center h-full gap-2">
                                    <div className="w-4 h-4 rounded-full bg-primary-500"></div>
                                    <span className="text-base font-bold text-gray-700">발달</span>
                                </div>
                            </td>
                            {hourlyRanges.map((range) => (
                                <td key={range.hour} className="h-32 p-0 border-r border-gray-200 align-middle w-64">
                                    {renderCellContent(
                                        timelineEvents.filter(e => e.type === 'development' && e.hour === range.hour),
                                        range.label,
                                        '발달'
                                    )}
                                </td>
                            ))}
                        </tr>

                        {/* 2. 안전 위험 행 */}
                        <tr className="bg-red-50/20">
                            <td className="h-32 py-0 border-b border-gray-200 sticky left-0 z-20 bg-gray-50 after:content-[''] after:absolute after:top-0 after:right-0 after:w-[1px] after:h-full after:bg-gray-200">
                                <div className="flex flex-col items-center justify-center h-full gap-2">
                                    <div className="w-4 h-4 rounded-full bg-danger animate-pulse"></div>
                                    <span className="text-base font-bold text-danger">위험</span>
                                </div>
                            </td>
                            {hourlyRanges.map((range) => (
                                <td key={range.hour} className="h-32 p-0 border-r border-gray-200 align-middle w-64">
                                    {renderCellContent(
                                        timelineEvents.filter(e => e.type === 'safety' && e.severity === 'danger' && e.hour === range.hour),
                                        range.label,
                                        '위험'
                                    )}
                                </td>
                            ))}
                        </tr>

                        {/* 3. 안전 주의 행 */}
                        <tr>
                            <td className="h-32 py-0 border-b border-gray-200 sticky left-0 z-20 bg-gray-50 after:content-[''] after:absolute after:top-0 after:right-0 after:w-[1px] after:h-full after:bg-gray-200">
                                <div className="flex flex-col items-center justify-center h-full gap-2">
                                    <div className="w-4 h-4 rounded-full bg-warning"></div>
                                    <span className="text-base font-bold text-gray-700">주의</span>
                                </div>
                            </td>
                            {hourlyRanges.map((range) => (
                                <td key={range.hour} className="h-32 p-0 border-r border-gray-200 align-middle w-64">
                                    {renderCellContent(
                                        timelineEvents.filter(e => e.type === 'safety' && e.severity === 'warning' && e.hour === range.hour),
                                        range.label,
                                        '주의'
                                    )}
                                </td>
                            ))}
                        </tr>

                        {/* 4. 안전 권장 행 */}
                        <tr>
                            <td className="h-32 py-0 border-b border-gray-200 sticky left-0 z-20 bg-gray-50 after:content-[''] after:absolute after:top-0 after:right-0 after:w-[1px] after:h-full after:bg-gray-200">
                                <div className="flex flex-col items-center justify-center h-full gap-2">
                                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                                    <span className="text-base font-bold text-gray-700">권장</span>
                                </div>
                            </td>
                            {hourlyRanges.map((range) => (
                                <td key={range.hour} className="h-32 p-0 border-r border-gray-200 align-middle w-64">
                                    {renderCellContent(
                                        timelineEvents.filter(e =>
                                            e.type === 'safety' &&
                                            e.severity === 'info' &&
                                            (e.category === '안전 권장' || e.category === '권장' || e.title.includes('권장')) &&
                                            e.hour === range.hour
                                        ),
                                        range.label,
                                        '권장'
                                    )}
                                </td>
                            ))}
                        </tr>

                        {/* 5. 안전 확인 행 */}
                        <tr>
                            <td className="h-32 py-0 border-b border-gray-200 sticky left-0 z-20 bg-gray-50 after:content-[''] after:absolute after:top-0 after:right-0 after:w-[1px] after:h-full after:bg-gray-200">
                                <div className="flex flex-col items-center justify-center h-full gap-2">
                                    <div className="w-4 h-4 rounded-full bg-safe"></div>
                                    <span className="text-base font-bold text-gray-700">확인</span>
                                </div>
                            </td>
                            {hourlyRanges.map((range) => (
                                <td key={range.hour} className="h-32 p-0 border-r border-gray-200 align-middle w-64">
                                    {renderCellContent(
                                        timelineEvents.filter(e =>
                                            e.type === 'safety' &&
                                            e.severity === 'info' &&
                                            (e.category === '안전 확인' || e.category === '확인' || (!e.category?.includes('권장') && !e.title.includes('권장'))) &&
                                            e.hour === range.hour
                                        ),
                                        range.label,
                                        '확인'
                                    )}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>


            {/* 모바일 카드 리스트 */}
            <div className="block lg:hidden space-y-4">
                {hourlyRanges.map((range) => {
                    const eventsInRange = timelineEvents.filter(e => e.hour === range.hour);

                    if (eventsInRange.length === 0) {
                        return null
                    }

                    return (
                        <div key={range.hour} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
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
    )
}
