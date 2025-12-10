import { motion } from 'motion/react'
import { Sparkles, Target, Lightbulb } from 'lucide-react'

interface DevelopmentSummaryProps {
    developmentSummary: string
    developmentInsights: string[]
}

export const DevelopmentSummary = ({ developmentSummary, developmentInsights }: DevelopmentSummaryProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2"
        >
            <div className="card p-8 bg-gradient-to-br from-primary-100/40 via-primary-50/30 to-cyan-50/30 border-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-200/30 to-blue-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-200/30 to-primary-200/30 rounded-full blur-3xl" />

                <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-6 h-6 text-primary-600" />
                        <h2 className="text-primary-900 text-xl font-semibold">오늘의 발달 요약</h2>
                    </div>
                    <div className="space-y-3 text-sm text-gray-700 leading-relaxed mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                                <Target className="w-5 h-5 text-primary-600" />
                            </div>
                            <span>
                                {developmentSummary || '아직 분석된 데이터가 없습니다. 영상을 업로드하면 AI가 분석합니다.'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-primary-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-primary-600" />
                            <p className="text-sm text-primary-600 font-semibold">발달 인사이트</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700 leading-relaxed">
                            {developmentInsights && developmentInsights.length > 0 ? (
                                developmentInsights.map((insight, idx) => (
                                    <p key={idx} className="flex items-start gap-1 text-xs">
                                        <span>•</span>
                                        <span>{insight}</span>
                                    </p>
                                ))
                            ) : (
                                <p className="text-gray-400 italic">분석된 인사이트가 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
