import { motion } from 'motion/react'
import { FileText, ArrowRight } from 'lucide-react'
import { RecommendedLink } from '../types'
import { ContentCard } from './ContentCard'

interface BlogRecommendationSectionProps {
    recommendedBlogs: RecommendedLink[]
    visibleBlogsCount: number
    setVisibleBlogsCount: React.Dispatch<React.SetStateAction<number>>
}

export const BlogRecommendationSection = ({
    recommendedBlogs,
    visibleBlogsCount,
    setVisibleBlogsCount
}: BlogRecommendationSectionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mb-10"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-sm">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">육아 꿀팁</h2>
                        <p className="text-sm text-gray-600">선배 부모들의 실전 노하우</p>
                    </div>
                </div>
                <button
                    onClick={() => setVisibleBlogsCount(prev => prev + 5)}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={visibleBlogsCount >= recommendedBlogs.length}
                >
                    더보기
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {recommendedBlogs.slice(0, visibleBlogsCount).map((link) => (
                    <ContentCard key={link.id} link={link} />
                ))}
            </div>
        </motion.div>
    )
}
