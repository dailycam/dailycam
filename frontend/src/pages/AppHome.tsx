import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Newspaper, ArrowRight, ChevronUp } from 'lucide-react'
import {
    getRecommendedBlogs,
    getRecommendedNews,
    getTrendingContent,
    searchContent
} from '../lib/api'
import { RecommendedLink } from '../features/home/types'
import { POPULAR_KEYWORDS } from '../features/home/constants'
import { SearchSection } from '../features/home/components/SearchSection'
import { TrendingSection } from '../features/home/components/TrendingSection'
import { BlogRecommendationSection } from '../features/home/components/BlogRecommendationSection'
import { QuickStartSection } from '../features/home/components/QuickStartSection'

export default function AppHome() {
    const [searchQuery, setSearchQuery] = useState<string>('')

    // 검색 결과 state
    const [searchResults, setSearchResults] = useState<RecommendedLink[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchFilter, setSearchFilter] = useState<'all' | 'youtube' | 'blog'>('all')

    // AI 추천 콘텐츠 state
    const [recommendedBlogs, setRecommendedBlogs] = useState<RecommendedLink[]>([])
    const [recommendedNews, setRecommendedNews] = useState<RecommendedLink[]>([])
    const [trendingContent, setTrendingContent] = useState<RecommendedLink[]>([])

    // 더보기 기능을 위한 표시 개수 state
    const [visibleBlogsCount, setVisibleBlogsCount] = useState(5)
    const [visibleTrendingCount, setVisibleTrendingCount] = useState(5)
    const [visibleNewsCount, setVisibleNewsCount] = useState(5)

    // AI 추천 콘텐츠 가져오기 (캐시 우선 전략)
    useEffect(() => {
        async function loadAIContent() {
            try {
                // 1. 캐시된 데이터 먼저 로드 (즉시 표시)
                const cachedBlogs = localStorage.getItem('cached_blogs')
                const cachedNews = localStorage.getItem('cached_news')
                const cachedTrending = localStorage.getItem('cached_trending')

                if (cachedBlogs || cachedNews || cachedTrending) {
                    console.log('📦 캐시된 콘텐츠 로드 중...')
                    if (cachedBlogs) setRecommendedBlogs(JSON.parse(cachedBlogs))
                    if (cachedNews) setRecommendedNews(JSON.parse(cachedNews))
                    if (cachedTrending) setTrendingContent(JSON.parse(cachedTrending))
                }

                // 2. 백그라운드에서 최신 데이터 가져오기
                console.log('🔄 최신 콘텐츠 가져오는 중...')
                const [blogs, news, trending] = await Promise.all([
                    getRecommendedBlogs(),
                    getRecommendedNews(),
                    getTrendingContent()
                ])

                // 3. 상태 업데이트 및 캐시 저장
                setRecommendedBlogs(blogs)
                setRecommendedNews(news)
                setTrendingContent(trending)

                localStorage.setItem('cached_blogs', JSON.stringify(blogs))
                localStorage.setItem('cached_news', JSON.stringify(news))
                localStorage.setItem('cached_trending', JSON.stringify(trending))

                console.log('✅ AI 추천 콘텐츠 로드 완료')
            } catch (error) {
                console.error('AI 콘텐츠 로드 실패:', error)
            }
        }

        loadAIContent()
    }, [])

    // 검색 핸들러
    const handleSearch = async (query?: string | React.FormEvent) => {
        let targetQuery = searchQuery;

        // 이벤트 객체인 경우 preventDefault
        if (query && typeof query === 'object' && 'preventDefault' in query) {
            query.preventDefault();
        } else if (typeof query === 'string') {
            // 문자열인 경우 (인기 검색어 클릭 등)
            targetQuery = query;
            setSearchQuery(query);
        }

        if (!targetQuery.trim() || targetQuery.trim().length < 2) {
            setSearchResults([])
            return
        }

        try {
            // 이전 검색 결과 초기화 (검색 중 표시를 위해)
            setSearchResults([])
            setIsSearching(true)
            setSearchFilter('all')

            // 아기/육아 관련 키워드 자동 추가
            const enhancedQuery = `${targetQuery.trim()} 아기 육아`
            console.log('검색 쿼리:', enhancedQuery)

            const results = await searchContent(enhancedQuery)
            setSearchResults(results)
        } catch (error) {
            console.error('검색 실패:', error)
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen bg-gradient-to-br from-green-50/20 via-emerald-50/10 to-teal-50/20">
            {/* 1. 검색창 + 인기 검색어 + 검색 결과 */}
            <SearchSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
                popularKeywords={POPULAR_KEYWORDS}
                searchResults={searchResults}
                isSearching={isSearching}
                searchFilter={searchFilter}
                setSearchFilter={setSearchFilter}
            />

            {/* 2. 육아 뉴스 & 정보 (AI 추천 뉴스) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-10"
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center shadow-sm">
                            <Newspaper className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">육아 뉴스 & 정보</h2>
                            <p className="text-sm text-gray-600">최신 육아 뉴스와 정책</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {visibleNewsCount > 5 && (
                            <button
                                onClick={() => setVisibleNewsCount(5)}
                                className="text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-1"
                            >
                                접기
                                <ChevronUp className="w-4 h-4" />
                            </button>
                        )}
                        {visibleNewsCount < recommendedNews.length && (
                            <button
                                onClick={() => setVisibleNewsCount(prev => prev + 5)}
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
                    {recommendedNews.slice(0, visibleNewsCount).map((link) => (
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

            {/* 3. 유튜브 (엄마들이 가장 많이 본) */}
            <TrendingSection
                trendingContent={trendingContent}
                visibleTrendingCount={visibleTrendingCount}
                setVisibleTrendingCount={setVisibleTrendingCount}
            />

            {/* 4. 블로그 (육아 꿀팁) */}
            <BlogRecommendationSection
                recommendedBlogs={recommendedBlogs}
                visibleBlogsCount={visibleBlogsCount}
                setVisibleBlogsCount={setVisibleBlogsCount}
            />

            {/* 5. 빠른 시작 */}
            <QuickStartSection />
        </div>
    )
}
