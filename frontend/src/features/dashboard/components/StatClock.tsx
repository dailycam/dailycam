import React from 'react'
import { LucideIcon } from 'lucide-react'

interface TimelineEvent {
    time: string
    hour: number
    type: 'development' | 'safety'
    severity?: 'danger' | 'warning' | 'info'
    title: string
    description?: string
    isSleepGroup?: boolean
    sleepStartTime?: string
    sleepEndTime?: string
}

interface StatClockProps {
    title: string
    icon: LucideIcon
    events: TimelineEvent[]
    type: 'mixed' | 'safety' | 'activity' | 'sleep'
    colorTheme: {
        bg: string
        text: string
        mainColor: string
    }
}

export const StatClock: React.FC<StatClockProps> = ({ title, icon: Icon, events, type, colorTheme }) => {
    const size = 160
    const center = size / 2
    const radius = 65
    const strokeWidth = 10

    // 시간 -> 각도 변환 (HH:mm 형식을 각도로)
    const timeToDegree = (timeStr: string | undefined) => {
        if (!timeStr) return 0
        const [h, m] = timeStr.split(':').map(Number)
        return ((h * 60 + m) / 1440) * 360
    }

    // Arc 그리기 함수
    const createArc = (startAngle: number, endAngle: number, r: number) => {
        const startRad = (startAngle - 90) * (Math.PI / 180)
        const endRad = (endAngle - 90) * (Math.PI / 180)
        const x1 = center + r * Math.cos(startRad)
        const y1 = center + r * Math.sin(startRad)
        const x2 = center + r * Math.cos(endRad)
        const y2 = center + r * Math.sin(endRad)
        const largeArc = endAngle - startAngle <= 180 ? 0 : 1
        return `M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    }

    return (
        <div className="flex flex-col items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm h-full">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-4 w-full">
                <div className={`p-1.5 rounded-lg ${colorTheme.bg}`}>
                    <Icon className={`w-4 h-4 ${colorTheme.text}`} />
                </div>
                <span className="font-bold text-gray-700 text-sm">{title}</span>
            </div>

            {/* 시계 SVG */}
            <div className="relative">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* 배경 원 */}
                    <circle cx={center} cy={center} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />

                    {/* 12시, 3시, 6시, 9시 눈금 */}
                    {[0, 90, 180, 270].map(deg => {
                        const rad = (deg - 90) * (Math.PI / 180)
                        const x1 = center + (radius - 5) * Math.cos(rad)
                        const y1 = center + (radius - 5) * Math.sin(rad)
                        const x2 = center + (radius + 5) * Math.cos(rad)
                        const y2 = center + (radius + 5) * Math.sin(rad)
                        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={2} strokeLinecap="round" />
                    })}

                    {/* --- 데이터 렌더링 로직 (Type에 따라 다름) --- */}

                    {/* 안전 이벤트만 표시 */}
                    {type === 'safety' && events.filter(e => e.type === 'safety').map((ev, i) => {
                        const deg = timeToDegree(ev.time)
                        const rad = (deg - 90) * Math.PI / 180
                        return (
                            <circle
                                key={i}
                                cx={center + radius * Math.cos(rad)}
                                cy={center + radius * Math.sin(rad)}
                                r={5}
                                fill={ev.severity === 'danger' ? '#ef4444' : ev.severity === 'warning' ? '#fbbf24' : '#3b82f6'}
                                className="animate-pulse"
                            />
                        )
                    })}

                    {/* 수면 시간만 표시 */}
                    {type === 'sleep' && events.filter(e => e.isSleepGroup).map((ev, i) => (
                        <path
                            key={i}
                            d={createArc(timeToDegree(ev.sleepStartTime), timeToDegree(ev.sleepEndTime), radius)}
                            fill={colorTheme.mainColor}
                            className="opacity-80"
                        />
                    ))}

                    {/* 발달 활동만 표시 */}
                    {type === 'activity' && events.filter(e => e.type === 'development' && !e.isSleepGroup).map((ev, i) => {
                        const deg = timeToDegree(ev.time)
                        return <path key={i} d={createArc(deg, deg + 10, radius)} fill={colorTheme.mainColor} />
                    })}

                    {/* 종합 (Mixed) - 모든 이벤트 표시 */}
                    {type === 'mixed' && events.map((ev, i) => {
                        if (ev.isSleepGroup) {
                            return <path key={`sleep-${i}`} d={createArc(timeToDegree(ev.sleepStartTime), timeToDegree(ev.sleepEndTime), radius)} fill="#C4B5FD" />
                        }
                        if (ev.type === 'development') {
                            const deg = timeToDegree(ev.time)
                            return <path key={`dev-${i}`} d={createArc(deg, deg + 8, radius)} fill="#38BDF8" />
                        }
                        if (ev.type === 'safety') {
                            const deg = timeToDegree(ev.time)
                            const rad = (deg - 90) * Math.PI / 180
                            return <circle key={`safety-${i}`} cx={center + radius * Math.cos(rad)} cy={center + radius * Math.sin(rad)} r={4} fill="#EF4444" />
                        }
                        return null
                    })}

                </svg>

                {/* 중앙 텍스트 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                    24H
                </div>
            </div>
        </div>
    )
}
