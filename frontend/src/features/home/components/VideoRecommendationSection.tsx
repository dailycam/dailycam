import { motion } from 'motion/react'
import { Hash, ArrowRight } from 'lucide-react'
import { RecommendedLink } from '../types'
import { ContentCard } from './ContentCard'
import { CATEGORIES } from '../constants'

interface VideoRecommendationSectionProps {
    recommendedVideos: RecommendedLink[]
    visibleVideosCount: number
    setVisibleVideosCount: React.Dispatch<React.SetStateAction<number>>
    selectedCategory: string
    setSelectedCategory: React.Dispatch<React.SetStateAction<string>>
}

export const VideoRecommendationSection = ({
    recommendedVideos,
    visibleVideosCount,
    setVisibleVideosCount,
    selectedCategory,
    setSelectedCategory
}: VideoRecommendationSectionProps) => {
    const filteredVideos = selectedCategory === '전체'
        ? recommendedVideos
        : recommendedVideos.filter(video => video.category === selectedCategory || video.tags.includes(selectedCategory))

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-10"
        >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                {/* 카테고리 필터 */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1 scrollbar-hide">
                    <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {CATEGORIES.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${selectedCategory === category
                                ? 'bg-primary-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setVisibleVideosCount(prev => prev + 5)}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    disabled={visibleVideosCount >= filteredVideos.length}
                >
                    더보기
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {filteredVideos.length > 0 ? (
                    filteredVideos.slice(0, visibleVideosCount).map((link) => (
                        <ContentCard key={link.id} link={link} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        해당 카테고리의 영상이 없습니다.
                    </div>
                )}
            </div>
        </motion.div>
    )
}
