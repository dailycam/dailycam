import { motion } from 'motion/react'
import { Search, Flame } from 'lucide-react'
import { RecommendedLink } from '../types'
import { ContentCard } from './ContentCard'

interface SearchSectionProps {
    searchQuery: string
    setSearchQuery: (query: string) => void
    handleSearch: (query?: string | React.FormEvent) => void
    popularKeywords: string[]
    searchResults: RecommendedLink[]
    isSearching: boolean
    searchFilter: 'all' | 'youtube' | 'blog'
    setSearchFilter: (filter: 'all' | 'youtube' | 'blog') => void
}

export const SearchSection = ({
    searchQuery,
    setSearchQuery,
    handleSearch,
    popularKeywords,
    searchResults,
    isSearching,
    searchFilter,
    setSearchFilter
}: SearchSectionProps) => {
    return (
        <>
            {/* 2. 검색창 + 인기 검색어 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-10"
            >
                <div className="card p-6 bg-gradient-to-br from-white to-green-50 border-0 shadow-md">
                    {/* 큰 검색창 */}
                    <div className="relative mb-4">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-400" />
                        <input
                            type="text"
                            placeholder="육아 정보 검색... (예: 모유 수유, 이유식, 수면교육)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch()
                                }
                            }}
                            className="w-full pl-16 pr-6 py-4 text-lg border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white/80 hover:bg-white transition-colors shadow-sm"
                        />
                    </div>

                    {/* 추천 검색어 */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-gray-600 flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-orange-500" />
                            인기 검색어
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {popularKeywords.map((keyword, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    handleSearch(keyword)
                                }}
                                className="px-4 py-2 bg-gray-100 hover:bg-primary-100 text-gray-700 hover:text-primary-700 rounded-full text-sm font-medium transition-all hover:scale-105"
                            >
                                #{keyword}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 검색 결과 섹션 */}
            {searchResults.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-10"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow-sm">
                                <Search className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">검색 결과</h2>
                                <p className="text-sm text-gray-600">'{searchQuery}' 검색 결과</p>
                            </div>
                        </div>

                        {/* 필터 버튼 */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setSearchFilter('all')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${searchFilter === 'all'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                전체
                            </button>
                            <button
                                onClick={() => setSearchFilter('youtube')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${searchFilter === 'youtube'
                                    ? 'bg-white text-red-500 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                유튜브
                            </button>
                            <button
                                onClick={() => setSearchFilter('blog')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${searchFilter === 'blog'
                                    ? 'bg-white text-green-500 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                블로그
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                        {searchResults
                            .filter(link => searchFilter === 'all' || link.type === searchFilter)
                            .map((link) => (
                                <ContentCard key={link.id} link={link} showViews={true} />
                            ))}
                    </div>
                </motion.div>
            )}

            {/* 검색 중 로딩 표시 */}
            {isSearching && (
                <div className="mb-10 text-center py-10">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                    <p className="mt-4 text-gray-600">검색 중...</p>
                </div>
            )}
        </>
    )
}
