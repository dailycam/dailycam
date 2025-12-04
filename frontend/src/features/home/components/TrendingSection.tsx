import { motion } from 'motion/react'
import { Flame, ArrowRight } from 'lucide-react'
import { RecommendedLink } from '../types'
import { ContentCard } from './ContentCard'

interface TrendingSectionProps {
    trendingContent: RecommendedLink[]
    visibleTrendingCount: number
    setVisibleTrendingCount: React.Dispatch<React.SetStateAction<number>>
}

export const TrendingSection = ({
    trendingContent,
    visibleTrendingCount,
    setVisibleTrendingCount
}: TrendingSectionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-10"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center shadow-sm">
                        <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">엄마들이 가장 많이 본</h2>
                        <p className="text-sm text-gray-600">이번 주 가장 도움이 된 콘텐츠</p>
                    </div>
                </div>
                <button
                    onClick={() => setVisibleTrendingCount(prev => prev + 5)}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={visibleTrendingCount >= trendingContent.length}
                >
                    더보기
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {trendingContent.slice(0, visibleTrendingCount).map((link) => (
                    <ContentCard key={link.id} link={link} showViews={true} />
                ))}
            </div>
        </motion.div>
    )
}
