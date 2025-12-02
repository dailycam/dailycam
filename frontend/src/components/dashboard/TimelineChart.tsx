import { Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type TimeRangeType = 'day' | 'week' | 'month' | 'year'

interface ChartDataPoint {
    time: string
    safety: number
    development: number
}

interface TimelineChartProps {
    timeRange: TimeRangeType
    setTimeRange: (range: TimeRangeType) => void
    selectedDate: Date
    setSelectedDate: (date: Date) => void
    chartData: ChartDataPoint[]
    isMobile: boolean
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
    timeRange,
    setTimeRange,
    selectedDate,
    setSelectedDate,
    chartData,
    isMobile
}) => {
    return (
        <>
            {/* 헤더 */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-primary-500" />
                    <div>
                        <h2 className="text-xl font-semibold">오늘의 활동 타임라인</h2>
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
                        {(['day', 'week', 'month', 'year'] as TimeRangeType[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeRange(t)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === t
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {t === 'day' ? '하루' : t === 'week' ? '7일' : t === 'month' ? '한달' : '1년'}
                            </button>
                        ))}
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

            {/* 차트 */}
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
        </>
    )
}
