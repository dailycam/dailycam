import { motion } from 'motion/react'
import { Lightbulb, ArrowRight, ChevronUp } from 'lucide-react'
import { RecommendedLink } from '../types'

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
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-300 to-emerald-400 flex items-center justify-center shadow-sm">
                        <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">육아 꿀팁</h2>
                        <p className="text-sm text-gray-600">선배 부모들의 실전 노하우</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {visibleBlogsCount > 5 && (
                        <button
                            onClick={() => setVisibleBlogsCount(5)}
                            className="text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-1"
                        >
                            접기
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    )}
                    {visibleBlogsCount < recommendedBlogs.length && (
                        <button
                            onClick={() => setVisibleBlogsCount(prev => prev + 5)}
                            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
                        >
                            더보기
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* 리스트 형식으로 변경 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                {recommendedBlogs.slice(0, visibleBlogsCount).map((link) => (
                    <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                    >
                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
                                {link.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">{link.category}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 flex-shrink-0 transition-colors" />
                    </a>
                ))}
            </div>
        </motion.div>
    )
}
