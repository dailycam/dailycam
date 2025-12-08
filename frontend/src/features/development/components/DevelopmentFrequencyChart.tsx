import { motion } from 'motion/react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { Lightbulb, BarChart2 } from 'lucide-react'
import { DevelopmentFrequencyItem } from '../types'
import { EmptyCard } from '../../../components/ui/EmptyState'

interface DevelopmentFrequencyChartProps {
    dailyDevelopmentFrequency: DevelopmentFrequencyItem[]
}

export const DevelopmentFrequencyChart = ({ dailyDevelopmentFrequency }: DevelopmentFrequencyChartProps) => {
    // 데이터가 없거나 모든 카운트가 0인 경우 확인
    const isEmpty = !dailyDevelopmentFrequency || dailyDevelopmentFrequency.length === 0 || dailyDevelopmentFrequency.every(item => item.count === 0)

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className="card p-8 border-0 h-full flex flex-col min-h-[600px]">
                <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold h-8">
                    <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-cyan-400 rounded-full" />
                    금일 발달 행동 빈도
                </h3>

                {isEmpty ? (
                    <div className="flex-1 flex items-center justify-center">
                        <EmptyCard
                            icon={BarChart2}
                            message="아직 감지된 발달 행동이 없습니다. 아이의 활동을 촬영해보세요."
                        />
                    </div>
                ) : (
                    <>
                        {/* 2단 컬럼 레이아웃 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                            {/* 왼쪽: 막대 그래프 */}
                            <div className="flex items-center justify-center">
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={dailyDevelopmentFrequency}>
                                        <defs>
                                            {dailyDevelopmentFrequency.map((item, index) => (
                                                <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={item.color} stopOpacity={0.9} />
                                                    <stop offset="95%" stopColor={item.color} stopOpacity={0.5} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="category" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                        <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            }}
                                        />
                                        <Bar dataKey="count" name="감지 횟수" radius={[8, 8, 0, 0]}>
                                            {dailyDevelopmentFrequency.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* 오른쪽: 텍스트 분석 및 팁 */}
                            <div className="space-y-4">
                                <h4 className="text-base font-semibold text-gray-800 mb-4">발달 영역별 분석</h4>
                                {dailyDevelopmentFrequency.slice(0, 3).map((item, index) => (
                                    <div key={index} className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-4 border border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <h5 className="font-semibold text-gray-800">{item.category} 발달</h5>
                                            <span className="ml-auto text-sm font-bold" style={{ color: item.color }}>{item.count}회</span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {index === 0 && `오늘 ${item.category} 관련 활동이 ${item.count}회 관찰되었어요. 일상 속에서 자연스럽게 경험을 늘려주세요.`}
                                            {index === 1 && `${item.category} 영역이 고르게 발달하고 있어요. 아이가 스스로 탐색할 수 있는 시간을 충분히 주세요.`}
                                            {index === 2 && `${item.category} 발달에 좋은 흐름을 보이고 있어요. 아이가 즐거워하는 놀이를 반복해주는 것만으로도 큰 도움이 됩니다.`}
                                        </p>
                                    </div>
                                ))}

                                <div className="bg-gradient-to-br from-primary-50/50 to-cyan-50/30 rounded-2xl p-4 border border-primary-200/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Lightbulb className="w-4 h-4 text-primary-600" />
                                        <h5 className="font-semibold text-primary-800">오늘의 팁</h5>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        규칙적인 활동과 충분한 수면이 모든 발달 영역에 긍정적인 영향을 줘요. 계속 이렇게 유지해주세요!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-5 gap-2">
                            {dailyDevelopmentFrequency.map((item, index) => (
                                <div key={index} className="text-center">
                                    <div className="w-full h-2 rounded-full mb-1" style={{ backgroundColor: item.color }} />
                                    <p className="text-xs text-gray-600">{item.category}</p>
                                    <p className="text-sm font-semibold" style={{ color: item.color }}>
                                        {item.count}회
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    )
}
