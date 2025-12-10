import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Search, Flame, ChevronDown } from 'lucide-react'
import { RecommendedLink } from '../types'
import { ContentCard } from './ContentCard'

interface SearchSectionProps {
    searchQuery: string
    setSearchQuery: (query: string) => void
    handleSearch: (query?: string | React.FormEvent) => void
    popularKeywords: string[]
    searchResults: RecommendedLink[]
    isSearching: boolean
    searchFilter: 'youtube' | 'blog' | 'news'
    setSearchFilter: (filter: 'youtube' | 'blog' | 'news') => void
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
    // 더보기 기능을 위한 상태
    const [visibleCount, setVisibleCount] = useState(searchFilter === 'youtube' ? 4 : 5)

    // 필터나 검색 결과가 바뀌면 더보기 초기화 (유튜브는 4개, 나머지는 5개)
    useEffect(() => {
        setVisibleCount(searchFilter === 'youtube' ? 4 : 5)
    }, [searchFilter, searchResults])

    return (
        <>
            {/* 2. 검색창 + 인기 검색어 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-10"
            >
                <div className="card p-6 bg-gradient-to-br from-white to-primary-50 border-0 shadow-md">
                    {/* 큰 검색창 */}
                    <div className="relative mb-4">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-primary-400" />
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
                            className="w-full pl-16 pr-6 py-4 text-lg border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white/80 hover:bg-white transition-colors shadow-sm"
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
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-300 to-primary-400 flex items-center justify-center shadow-sm">
                                <Search className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">검색 결과</h2>
                                <p className="text-sm text-gray-600">'{searchQuery}' 검색 결과</p>
                            </div>
                        </div>

                        {/* 탭 스타일 필터 버튼 */}
                        <div className="flex bg-gray-100/50 p-1 rounded-xl w-full sm:w-auto">
                            <button
                                onClick={() => setSearchFilter('youtube')}
                                className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold whitespace-nowrap min-w-[90px] transition-all rounded-lg ${searchFilter === 'youtube'
                                    ? 'text-primary-600 bg-white shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                유튜브
                            </button>
                            <button
                                onClick={() => setSearchFilter('blog')}
                                className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold whitespace-nowrap min-w-[90px] transition-all rounded-lg ${searchFilter === 'blog'
                                    ? 'text-primary-600 bg-white shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                블로그
                            </button>
                            <button
                                onClick={() => setSearchFilter('news')}
                                className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold whitespace-nowrap min-w-[90px] transition-all rounded-lg ${searchFilter === 'news'
                                    ? 'text-primary-600 bg-white shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                뉴스
                            </button>
                        </div>
                    </div>

                    {/* 검색 결과 렌더링 */}
                    {(() => {
                        // 탭에 따라 필터링
                        let filteredResults: RecommendedLink[] = [];

                        if (searchFilter === 'youtube') {
                            filteredResults = searchResults.filter(link => link.type === 'youtube');
                        } else if (searchFilter === 'blog') {
                            filteredResults = searchResults.filter(link => link.type === 'blog');
                        } else {
                            // news 탭: 유튜브와 블로그가 아닌 것들
                            filteredResults = searchResults.filter(link => link.type !== 'youtube' && link.type !== 'blog');
                        }

                        if (filteredResults.length === 0) {
                            return (
                                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <p className="text-gray-500">검색 결과가 없습니다.</p>
                                </div>
                            );
                        }

                        // 더보기 로직 적용
                        const visibleItems = filteredResults.slice(0, visibleCount);
                        const hasMore = filteredResults.length > visibleCount;

                        const LoadMoreButton = () => (
                            <button
                                onClick={() => setVisibleCount(prev => prev + (searchFilter === 'youtube' ? 4 : 5))}
                                className="w-full py-3 mt-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all flex items-center justify-center gap-1 group"
                            >
                                검색 결과 더보기
                                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                            </button>
                        );

                        // 유튜브는 카드 뷰
                        if (searchFilter === 'youtube') {
                            return (
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        {visibleItems.map(link => (
                                            <ContentCard key={link.id} link={link} showViews={true} />
                                        ))}
                                    </div>
                                    {hasMore && <LoadMoreButton />}
                                </div>
                            );
                        }

                        // 블로그/뉴스는 리스트 뷰
                        return (
                            <div>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                                    {visibleItems.map(link => (
                                        <a
                                            key={link.id}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group"
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${searchFilter === 'blog' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {searchFilter === 'blog' ? '블로그' : '뉴스'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{link.category}</span>
                                                </div>
                                                <h3 className="text-base font-medium text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
                                                    {link.title}
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                                    {link.description || link.title}
                                                </p>
                                            </div>
                                            <div className="flex items-center text-gray-400 group-hover:text-primary-600 transition-colors">
                                                <span className="text-sm mr-2 opacity-0 group-hover:opacity-100 transition-opacity">이동</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M5 12h14" />
                                                    <path d="m12 5 7 7-7 7" />
                                                </svg>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                                {hasMore && <LoadMoreButton />}
                            </div>
                        );
                    })()}
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
