import { motion } from 'motion/react'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Activity } from 'lucide-react'
import { RadarDataItem } from '../types'
import { EmptyCard } from '../../../components/ui/EmptyState'

interface DevelopmentRadarChartProps {
    radarData: RadarDataItem[]
}

export const DevelopmentRadarChart = ({ radarData }: DevelopmentRadarChartProps) => {
    // 데이터가 없거나 모든 점수가 0인 경우 확인
    const isEmpty = !radarData || radarData.length === 0 || radarData.every(item => item.score === 0)

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
        >
            <div className="card p-8 border-0 h-full flex flex-col min-h-[600px]">
                <div className="mb-6 h-8">
                    <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                        <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
                        영역별 발달 분석
                    </h3>
                    <p className="text-sm text-gray-600">우리 아이의 5가지 발달 영역 현황입니다</p>
                </div>

                {isEmpty ? (
                    <div className="flex-1 flex items-center justify-center">
                        <EmptyCard
                            icon={Activity}
                            message="아직 분석된 발달 데이터가 없습니다. 영상을 업로드하여 분석을 시작해보세요."
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-center flex-1 min-h-0 py-4">
                            <ResponsiveContainer width="100%" height={320}>
                                <RadarChart data={radarData}>
                                    <defs>
                                        <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#0284c7" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <PolarGrid stroke="#e5e7eb" strokeWidth={1.5} />
                                    <PolarAngleAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 500 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} tickCount={6} />
                                    <Radar
                                        name="내 아이"
                                        dataKey="score"
                                        stroke="#14b8a6"
                                        fill="#14b8a6"
                                        fillOpacity={0.35}
                                        strokeWidth={2.5}
                                        dot={{ fill: '#14b8a6', strokeWidth: 2, r: 5, stroke: '#fff' }}
                                    />
                                    <Radar
                                        name="또래 평균"
                                        dataKey="average"
                                        stroke="#9ca3af"
                                        fill="none"
                                        strokeDasharray="5 5"
                                        strokeWidth={2}
                                        dot={{ fill: '#9ca3af', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 긍정적 메시지 박스 */}
                        <div className="mt-2 p-4 bg-primary-50/50 rounded-2xl border border-primary-200/50">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                <span className="font-semibold text-primary-700">긍정적인 발달을 보이고 있어요!</span>
                                {radarData.some(item => item.score < item.average) && (
                                    <span> 지금은 조금 느리지만, 아래 추천 활동을 함께하면 금방 자라나요!</span>
                                )}
                            </p>
                        </div>

                        <div className="mt-4 grid grid-cols-5 gap-2">
                            {radarData.map((item, index) => (
                                <div key={index} className="bg-gradient-to-br from-primary-100/50 to-primary-50/30 rounded-2xl p-2.5 text-center">
                                    <p className="text-xs text-gray-600 mb-1">{item.category}</p>
                                    <p className="text-lg text-primary-600 font-semibold">{item.score}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    )
}
