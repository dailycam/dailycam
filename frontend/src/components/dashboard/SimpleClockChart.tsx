import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface ClockData {
    hour: number
    safetyLevel: 'safe' | 'warning' | 'danger' | null
    safetyScore: number
    color: string
    incident: string
}

interface Event {
    time: string
    type: 'development' | 'safety'
    severity?: 'danger' | 'warning' | 'info'
    title?: string
}

interface MonitoringRange {
    start: string
    end: string
}

interface SimpleClockChartProps {
    fullClockData: ClockData[]
    events: Event[]
    monitoringRanges?: MonitoringRange[]
    onHoverChange?: (hour: number | null) => void
    onHourClick?: (hour: number) => void
}

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    }
}

// 도넛 조각(Arc) 생성 함수 (두께 포함)
const describeDonutSlice = (x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
    const startOuter = polarToCartesian(x, y, outerRadius, endAngle)
    const endOuter = polarToCartesian(x, y, outerRadius, startAngle)
    const startInner = polarToCartesian(x, y, innerRadius, endAngle)
    const endInner = polarToCartesian(x, y, innerRadius, startAngle)

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

    return [
        "M", startOuter.x, startOuter.y,
        "A", outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
        "L", endInner.x, endInner.y,
        "A", innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
        "Z"
    ].join(" ")
}

// 파스텔 톤 색상 정의
const COLORS = {
    safe: '#34d399',      // 부드러운 에메랄드
    warning: '#fbbf24',   // 따뜻한 앰버
    danger: '#f87171',    // 부드러운 코랄
    development: '#c084fc', // 부드러운 라벤더 (보라)
    monitoring: '#60a5fa',  // 부드러운 하늘색
    baseGray: '#e5e7eb',
    baseGreen: '#34d399'  // safe 색상과 동일하게
}

export const SimpleClockChart: React.FC<SimpleClockChartProps> = ({ fullClockData, events, monitoringRanges = [], onHoverChange, onHourClick }) => {
    const size = 320
    const center = size / 2
    const radius = 100

    // 툴팁 상태
    const [hoveredHour, setHoveredHour] = useState<number | null>(null)
    const [hoveredMonitoring, setHoveredMonitoring] = useState<MonitoringRange | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    // 호버 핸들러
    const handleHover = (hour: number | null) => {
        setHoveredHour(hour)
        if (onHoverChange) onHoverChange(hour)
    }

    // 1. [Time Layer] 실시간 시간 상태 관리
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const hours = time.getHours()
    const minutes = time.getMinutes()
    const seconds = time.getSeconds()

    // 각도 계산
    const hourAngle = ((hours % 12) * 30) + (minutes * 0.5)
    const minuteAngle = (minutes * 6) + (seconds * 0.1)
    const secondAngle = seconds * 6

    // 12시간 데이터 매핑 (안전 + 발달 정보 통합)
    const clockBars = useMemo(() => {
        const bars = []
        for (let i = 1; i <= 12; i++) {
            // 각도 계산: 12시 -> 0도, 1시 -> 30도
            const startAngle = (i % 12) * 30
            const endAngle = startAngle + 30

            const amHour = i === 12 ? 0 : i
            const pmHour = i === 12 ? 12 : i + 12

            // 안전 데이터 확인
            const amData = fullClockData.find(d => d.hour === amHour)
            const pmData = fullClockData.find(d => d.hour === pmHour)

            let safetyColor = COLORS.safe // 기본 안전 (파스텔 초록)

            if (amData || pmData) {
                if (amData?.safetyLevel === 'danger' || pmData?.safetyLevel === 'danger') {
                    safetyColor = COLORS.danger // 위험 (파스텔 빨강)
                } else if (amData?.safetyLevel === 'warning' || pmData?.safetyLevel === 'warning') {
                    safetyColor = COLORS.warning // 주의 (파스텔 노랑)
                }
            }

            // 발달 데이터 확인
            const hasDevEvent = events.some(e => {
                const h = parseInt(e.time.split(':')[0])
                return (e.type === 'development') && (h === amHour || h === pmHour)
            })

            const devColor = hasDevEvent ? COLORS.development : COLORS.baseGray // 발달 있으면 파스텔 보라, 없으면 연회색

            // 해당 시간의 이벤트 목록 (툴팁용)
            const hourEvents = events.filter(e => {
                const h = parseInt(e.time.split(':')[0])
                return h === amHour || h === pmHour
            })

            bars.push({
                startAngle,
                endAngle,
                safetyColor,
                devColor,
                hour: i,
                events: hourEvents
            })
        }
        return bars
    }, [fullClockData, events])

    return (
        <div className="flex flex-col items-center relative">
            <div className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                24시간 안전 현황
            </div>

            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                }}
                onMouseLeave={() => {
                    handleHover(null)
                    setHoveredMonitoring(null)
                }}
            >
                <defs>
                    <filter id="hand-shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                        <feOffset dx="1" dy="2" result="offsetblur" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.3" />
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* 시계 배경 */}
                <circle cx={center} cy={center} r={radius + 10} fill="#fafafa" stroke="#e5e7eb" strokeWidth="1" />

                {/* 시계 눈금 */}
                {Array.from({ length: 60 }).map((_, i) => {
                    const angle = i * 6
                    const isMajor = i % 5 === 0
                    const r1 = radius + 5
                    const r2 = radius + (isMajor ? 0 : 3)
                    const pos1 = polarToCartesian(center, center, r1, angle)
                    const pos2 = polarToCartesian(center, center, r2, angle)

                    return (
                        <line
                            key={i}
                            x1={pos1.x} y1={pos1.y}
                            x2={pos2.x} y2={pos2.y}
                            stroke="#cbd5e1"
                            strokeWidth={isMajor ? 2 : 1}
                            strokeLinecap="round"
                        />
                    )
                })}

                {/* 12개 숫자 */}
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => {
                    const angle = (num === 12 ? 0 : num * 30)
                    const textPos = polarToCartesian(center, center, radius - 20, angle)
                    return (
                        <text
                            key={num}
                            x={textPos.x}
                            y={textPos.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-lg font-bold fill-gray-800"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                            {num}
                        </text>
                    )
                })}

                {/* 2단 띠 (Ring) - 베이스 레이어 */}
                <circle cx={center} cy={center} r={radius + 30} fill="none" stroke={COLORS.baseGray} strokeWidth="10" />
                <circle cx={center} cy={center} r={radius + 42} fill="none" stroke={COLORS.baseGreen} strokeWidth="10" />

                {/* 2단 띠 (Ring) - 이벤트 오버레이 */}
                {clockBars.map((bar) => {
                    const start = bar.startAngle
                    const end = bar.endAngle

                    // 클릭 핸들러: 12시간 형식 hour를 24시간 형식으로 변환
                    const handleClick = () => {
                        if (!onHourClick) return

                        const currentHour = new Date().getHours()
                        const amHour = bar.hour === 12 ? 0 : bar.hour
                        const pmHour = bar.hour === 12 ? 12 : bar.hour + 12

                        // 현재 시간에 가까운 시간대 선택 (AM vs PM)
                        const amDiff = Math.abs(currentHour - amHour)
                        const pmDiff = Math.abs(currentHour - pmHour)

                        onHourClick(amDiff <= pmDiff ? amHour : pmHour)
                    }

                    return (
                        <g
                            key={bar.hour}
                            onMouseEnter={() => handleHover(bar.hour)}
                            onClick={handleClick}
                            className="cursor-pointer transition-opacity hover:opacity-80"
                        >
                            {/* 안쪽 띠 (발달) */}
                            {bar.devColor !== COLORS.baseGray && (
                                <path
                                    d={describeDonutSlice(center, center, radius + 25, radius + 35, start, end)}
                                    fill={bar.devColor}
                                />
                            )}

                            {/* 중간 띠 (안전) */}
                            {bar.safetyColor !== COLORS.safe && (
                                <path
                                    d={describeDonutSlice(center, center, radius + 37, radius + 47, start, end)}
                                    fill={bar.safetyColor}
                                />
                            )}

                            {/* 투명 히트박스 */}
                            <path
                                d={describeDonutSlice(center, center, radius + 25, radius + 47, start, end)}
                                fill="transparent"
                            />
                        </g>
                    )
                })}

                {/* --- [4단계: 모니터링 구간 레이어 (가장 바깥쪽)] --- */}
                {monitoringRanges.map((range, idx) => {
                    const [startH] = range.start.split(':').map(Number)
                    const [endH] = range.end.split(':').map(Number)

                    const startHour12 = startH % 12
                    const endHour12 = endH % 12

                    const startAngle = startHour12 * 30
                    let endAngle = (endHour12 + 1) * 30

                    return (
                        <g
                            key={`mon-${idx}`}
                            onMouseEnter={() => setHoveredMonitoring(range)}
                            onMouseLeave={() => setHoveredMonitoring(null)}
                            className="cursor-pointer"
                        >
                            {/* 모니터링 띠 (가장 바깥쪽: radius + 52 ~ + 58) */}
                            <path
                                d={describeDonutSlice(center, center, radius + 52, radius + 58, startAngle, endAngle)}
                                fill={COLORS.monitoring}
                                opacity={hoveredMonitoring === range ? "1" : "0.6"}
                                className="transition-opacity duration-200"
                            />
                        </g>
                    )
                })}

                {/* --- [1단계: 시계 바늘 레이어] --- */}
                <g filter="url(#hand-shadow)">
                    {/* 시침 */}
                    {(() => {
                        const hourHandEnd = polarToCartesian(center, center, radius * 0.55, hourAngle)
                        return (
                            <line
                                x1={center} y1={center}
                                x2={hourHandEnd.x} y2={hourHandEnd.y}
                                stroke="#1f2937"
                                strokeWidth="6"
                                strokeLinecap="round"
                            />
                        )
                    })()}

                    {/* 분침 */}
                    {(() => {
                        const minuteHandEnd = polarToCartesian(center, center, radius * 0.8, minuteAngle)
                        return (
                            <line
                                x1={center} y1={center}
                                x2={minuteHandEnd.x} y2={minuteHandEnd.y}
                                stroke="#374151"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                        )
                    })()}

                    {/* 초침 */}
                    {(() => {
                        const secondHandEnd = polarToCartesian(center, center, radius * 0.85, secondAngle)
                        const secondHandStart = polarToCartesian(center, center, -20, secondAngle)
                        return (
                            <g>
                                <line
                                    x1={secondHandStart.x} y1={secondHandStart.y}
                                    x2={secondHandEnd.x} y2={secondHandEnd.y}
                                    stroke={COLORS.warning}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <circle cx={center} cy={center} r="3" fill={COLORS.warning} />
                            </g>
                        )
                    })()}

                    {/* 중심점 */}
                    <circle cx={center} cy={center} r="5" fill="#1f2937" />
                </g>
            </svg>

            {/* 툴팁 */}
            <AnimatePresence>
                {(hoveredHour !== null || hoveredMonitoring !== null) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute z-50 bg-gray-900/90 text-white p-3 rounded-xl shadow-xl backdrop-blur-sm border border-gray-700 pointer-events-none"
                        style={{
                            left: mousePos.x + 20,
                            top: mousePos.y - 20,
                            minWidth: '200px'
                        }}
                    >
                        {hoveredMonitoring ? (
                            <div>
                                <div className="font-bold text-sm mb-1 text-blue-300 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                                    모니터링 분석 완료
                                </div>
                                <div className="text-xs text-gray-300">
                                    {hoveredMonitoring.start} ~ {hoveredMonitoring.end}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="font-bold text-sm mb-2 border-b border-gray-700 pb-1">
                                    🕒 {hoveredHour}시 리포트
                                </div>
                                <div className="space-y-1.5">
                                    {clockBars.find(b => b.hour === hoveredHour)?.events.length === 0 ? (
                                        <div className="text-xs text-gray-400">감지된 이벤트가 없습니다.</div>
                                    ) : (
                                        clockBars.find(b => b.hour === hoveredHour)?.events.map((ev, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <span className={`w-1.5 h-1.5 rounded-full`} style={{
                                                    backgroundColor:
                                                        ev.type === 'development' ? COLORS.development :
                                                            ev.severity === 'danger' ? COLORS.danger : COLORS.warning
                                                }} />
                                                <span className="text-gray-300">{ev.time}</span>
                                                <span className="font-medium">
                                                    {ev.title || (ev.type === 'development' ? '발달 행동 감지' : '안전 이벤트')}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 범례 */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.safe }}></div>
                    <span className="text-gray-600">안전</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.warning }}></div>
                    <span className="text-gray-600">주의</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.danger }}></div>
                    <span className="text-gray-600">위험</span>
                </div>
            </div>
        </div>
    )
}
