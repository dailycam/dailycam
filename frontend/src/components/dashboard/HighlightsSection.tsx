import { motion } from 'motion/react'
import { Sparkles, ChevronRight } from 'lucide-react'
import type { RecommendationItem } from '../../lib/api'

interface HighlightsSectionProps {
    recommendations: RecommendationItem[]
}

export const HighlightsSection: React.FC<HighlightsSectionProps> = ({ recommendations }) => {
    const bgColorMap: Record<string, string> = {
        high: 'bg-danger-light/30',
        medium: 'bg-primary-100/50',
        low: 'bg-safe-light/30',
    }

    return (
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
                    <h2 className="text-xl font-semibold font-bold">오늘의 하이라이트</h2>
                    <p className="text-sm text-gray-500">AI가 분석한 지수의 하루</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-5 mb-5">
                {recommendations && recommendations.length > 0 ? (
                    recommendations.map((rec, index) => {
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
                    <div className="card p-6 border-0 bg-primary-100/50">
                        <h3 className="text-lg font-semibold mb-2">분석을 시작해보세요</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            영상을 업로드하면 AI가 분석 결과를 제공합니다.
                        </p>
                    </div>
                )}
            </div>

            {/* CTA 버튼 */}
            <div className="grid lg:grid-cols-2 gap-5">
                <a
                    href="/development-report"
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white h-14 rounded-2xl flex items-center justify-center font-medium transition-all hover:from-primary-600 hover:to-primary-700 hover:shadow-md"
                >
                    발달 리포트 자세히 보기
                    <ChevronRight className="w-5 h-5 ml-1" />
                </a>
                <a
                    href="/safety-report"
                    className="w-full bg-gradient-to-r from-safe to-safe-dark text-white h-14 rounded-2xl flex items-center justify-center font-medium transition-all hover:from-safe-dark hover:to-safe-dark hover:shadow-md"
                >
                    안전 리포트 자세히 보기
                    <ChevronRight className="w-5 h-5 ml-1" />
                </a>
            </div>
        </motion.div>
    )
}
