import React from 'react'
import { Shield, Baby, Eye, Activity } from 'lucide-react'

interface Event {
    time: string
    type: 'danger' | 'warning' | 'info'
}

interface MasterClockProps {
    safetyScore?: number
    developmentScore?: number
    monitoringTime?: number
    events?: Event[]
}

export const MasterClock: React.FC<MasterClockProps> = ({
    safetyScore = 0,
    developmentScore = 0,
    monitoringTime = 0,
    events = []
}) => {
    const size = 320
    const center = size / 2
    const radius = 120
    const strokeWidth = 12

    // 시간(HH:MM) -> 각도 변환 (24시간계)
    const timeToDegree = (timeStr: string) => {
        if (!timeStr) return 0
        const [h, m] = timeStr.split(':').map(Number)
        return ((h * 60 + m) / 1440) * 360 - 90
    }

    // 모니터링 시간 -> 부채꼴 Path
    const createMonitoringArc = () => {
        const endDeg = (monitoringTime / 24) * 360
        const x = center + radius * Math.cos((endDeg - 90) * Math.PI / 180)
        const y = center + radius * Math.sin((endDeg - 90) * Math.PI / 180)
        const largeArc = endDeg > 180 ? 1 : 0

        return `M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y} Z`
    }

    // 시계 눈금 생성
    const ticks = Array.from({ length: 12 }).map((_, i) => {
        const deg = i * 30
        const rad = (deg - 90) * (Math.PI / 180)
        return {
            x1: center + (radius - 15) * Math.cos(rad),
            y1: center + (radius - 15) * Math.sin(rad),
            x2: center + (radius - 5) * Math.cos(rad),
            y2: center + (radius - 5) * Math.sin(rad),
            label: i === 0 ? 12 : i
        }
    })

    return (
        <div className="relative flex items-center justify-center p-8">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* 배경 원 */}
                <circle cx={center} cy={center} r={radius} fill="#FAFAFA" stroke="#E5E7EB" strokeWidth="1" />

                {/* 모니터링 시간 (Pie Slice) */}
                {monitoringTime > 0 && (
                    <path
                        d={createMonitoringArc()}
                        fill="#ECFDF5"
                        stroke="none"
                        className="opacity-80"
                    />
                )}

                {/* 시계 눈금 & 숫자 */}
                {ticks.map((t, i) => (
                    <g key={i}>
                        <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#9CA3AF" strokeWidth={i % 3 === 0 ? 2 : 1} />
                        {i % 3 === 0 && (
                            <text
                                x={center + (radius - 30) * Math.cos((i * 30 - 90) * Math.PI / 180)}
                                y={center + (radius - 30) * Math.sin((i * 30 - 90) * Math.PI / 180)}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-[10px] fill-gray-400 font-bold"
                            >
                                {t.label}
                            </text>
                        )}
                    </g>
                ))}

                {/* 좌측: 안전 점수 게이지 (Green) */}
                <circle
                    cx={center} cy={center} r={radius + 10}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${Math.PI * (radius + 10)} ${Math.PI * (radius + 10)}`}
                    transform={`rotate(90 ${center} ${center})`}
                    className="opacity-30"
                />
                <circle
                    cx={center} cy={center} r={radius + 10}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${Math.PI * (radius + 10) * (safetyScore / 100)} ${2 * Math.PI * (radius + 10)}`}
                    transform={`rotate(180 ${center} ${center})`}
                    className="transition-all duration-1000 ease-out"
                />

                {/* 우측: 발달 점수 게이지 (Blue) */}
                <circle
                    cx={center} cy={center} r={radius + 10}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${Math.PI * (radius + 10)} ${Math.PI * (radius + 10)}`}
                    transform={`rotate(-90 ${center} ${center})`}
                    className="opacity-30"
                />
                <circle
                    cx={center} cy={center} r={radius + 10}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${Math.PI * (radius + 10) * (developmentScore / 100)} ${2 * Math.PI * (radius + 10)}`}
                    transform={`rotate(0 ${center} ${center})`}
                    className="transition-all duration-1000 ease-out"
                />

                {/* 이벤트 마커 */}
                {events.map((ev, i) => {
                    const deg = timeToDegree(ev.time)
                    const rad = deg * (Math.PI / 180)
                    const iconX = center + (radius - 20) * Math.cos(rad)
                    const iconY = center + (radius - 20) * Math.sin(rad)

                    return (
                        <circle
                            key={i}
                            cx={iconX} cy={iconY} r={4}
                            fill={ev.type === 'danger' ? '#EF4444' : ev.type === 'warning' ? '#F59E0B' : '#3B82F6'}
                            className="animate-pulse"
                        />
                    )
                })}

                {/* 시계 바늘 (현재 시간) */}
                <line x1={center} y1={center} x2={center} y2={center - radius + 20} stroke="#374151" strokeWidth="4" strokeLinecap="round" />
                <line x1={center} y1={center} x2={center + 40} y2={center} stroke="#6B7280" strokeWidth="3" strokeLinecap="round" />
                <circle cx={center} cy={center} r={6} fill="#374151" />

            </svg>

            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none">
                <div className="text-center mt-2">
                    <span className="text-xs text-gray-400 font-medium">24H Monitoring</span>
                </div>
                <div className="text-center mb-2">
                    <span className="text-xl font-bold text-gray-700">{monitoringTime.toFixed(1)}h</span>
                    <span className="text-[10px] text-gray-400 block">REC TIME</span>
                </div>
            </div>

            {/* 좌측 라벨 (안전) */}
            <div className="absolute top-1/2 -left-12 -translate-y-1/2 flex flex-col items-end">
                <Shield className="w-6 h-6 text-emerald-500 mb-1" />
                <span className="text-2xl font-bold text-gray-800">{safetyScore}</span>
                <span className="text-xs text-gray-400">안전</span>
            </div>

            {/* 우측 라벨 (발달) */}
            <div className="absolute top-1/2 -right-12 -translate-y-1/2 flex flex-col items-start">
                <Baby className="w-6 h-6 text-blue-500 mb-1" />
                <span className="text-2xl font-bold text-gray-800">{developmentScore}</span>
                <span className="text-xs text-gray-400">발달</span>
            </div>
        </div>
    )
}

// 요약 카드 포함한 섹션
interface DashboardClockSectionProps {
    safetyScore: number
    developmentScore: number
    monitoringTime: number
    events: Event[]
    aiSummary?: string
}

export const DashboardClockSection: React.FC<DashboardClockSectionProps> = ({
    safetyScore,
    developmentScore,
    monitoringTime,
    events,
    aiSummary = "오늘 하루 안전하게 보냈습니다."
}) => {
    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-around gap-8 mb-8">

            {/* 메인 시계 */}
            <div className="relative">
                <MasterClock
                    safetyScore={safetyScore}
                    developmentScore={developmentScore}
                    monitoringTime={monitoringTime}
                    events={events}
                />
            </div>

            {/* 데이터 요약 카드 */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">모니터링</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                        {monitoringTime.toFixed(1)}
                        <span className="text-sm font-normal text-gray-500">시간</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">오늘 누적 녹화</p>
                </div>

                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700">이벤트</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                        {events.length}
                        <span className="text-sm font-normal text-gray-500">건</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">감지된 이슈</p>
                </div>

                <div className="col-span-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        <span className="font-bold text-gray-800">AI 요약:</span> {aiSummary}
                    </p>
                </div>
            </div>

        </div>
    )
}
