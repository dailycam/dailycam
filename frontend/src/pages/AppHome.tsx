import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Newspaper, ArrowRight } from 'lucide-react'
import {
    getRecommendedBlogs,
    getRecommendedNews,
    getTrendingContent,
    searchContent
} from '../lib/api'
import { getAuthToken } from '../lib/auth'
import { RecommendedLink } from '../features/home/types'
import {
    POPULAR_KEYWORDS,
    HIGHLIGHT_MOMENTS
} from '../features/home/constants'
import { HighlightSection } from '../features/home/components/HighlightSection'
import { SearchSection } from '../features/home/components/SearchSection'
import { TrendingSection } from '../features/home/components/TrendingSection'
import { BlogRecommendationSection } from '../features/home/components/BlogRecommendationSection'
import { QuickStartSection } from '../features/home/components/QuickStartSection'
import { ContentCard } from '../features/home/components/ContentCard'

export default function AppHome() {
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [userInfo, setUserInfo] = useState<{ child_name?: string } | null>(null)

    // 검색 결과 state
    const [searchResults, setSearchResults] = useState<RecommendedLink[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchFilter, setSearchFilter] = useState<'all' | 'youtube' | 'blog'>('all')

    // AI 추천 콘텐츠 state
    const [recommendedBlogs, setRecommendedBlogs] = useState<RecommendedLink[]>([])
    const [recommendedNews, setRecommendedNews] = useState<RecommendedLink[]>([])
    const [trendingContent, setTrendingContent] = useState<RecommendedLink[]>([])
    const [contentLoading, setContentLoading] = useState(true)



    // 더보기 기능을 위한 표시 개수 state
    const [visibleBlogsCount, setVisibleBlogsCount] = useState(5)
    const [visibleTrendingCount, setVisibleTrendingCount] = useState(5)
    const [visibleNewsCount, setVisibleNewsCount] = useState(5)

    // 사용자 정보 가져오기
    useEffect(() => {
        const fetchUserInfo = async () => {
            const token = getAuthToken()
            if (!token) return

            try {
                const response = await fetch('http://localhost:8000/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (response.ok) {
                    const data = await response.json()
                    setUserInfo(data)
                }
            } catch (error) {
                console.error('사용자 정보 로드 실패:', error)
            }
        }
        fetchUserInfo()
    }, [])

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
                    setContentLoading(false) // 캐시 표시 후 로딩 종료
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

                console.log('✅ AI 추천 콘텐츠 로드 완료:', { blogs, news, trending })
            } catch (error) {
                console.error('AI 콘텐츠 로드 실패:', error)
            } finally {
                setContentLoading(false)
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
            {/* 1. 지수의 하루 - 오늘의 하이라이트 */}
            <HighlightSection userInfo={userInfo} moments={HIGHLIGHT_MOMENTS} />

            {/* 2. 검색창 + 인기 검색어 + 검색 결과 */}
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

            {/* 3. 엄마들이 가장 많이 본 */}
            <TrendingSection
                trendingContent={trendingContent}
                visibleTrendingCount={visibleTrendingCount}
                setVisibleTrendingCount={setVisibleTrendingCount}
            />

            {/* 5. 육아 꿀팁 (블로그) */}
            <BlogRecommendationSection
                recommendedBlogs={recommendedBlogs}
                visibleBlogsCount={visibleBlogsCount}
                setVisibleBlogsCount={setVisibleBlogsCount}
            />

            {/* 6. 육아 뉴스 & 정보 (AI 추천 뉴스) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-10"
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm">
                            <Newspaper className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">육아 뉴스 & 정보</h2>
                            <p className="text-sm text-gray-600">최신 육아 뉴스와 정책</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setVisibleNewsCount(prev => prev + 5)}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={visibleNewsCount >= recommendedNews.length}
                    >
                        더보기
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {recommendedNews.slice(0, visibleNewsCount).map((link) => (
                        <ContentCard key={link.id} link={link} />
                    ))}
                </div>
            </motion.div>

            {/* 7. 빠른 시작 */}
            <QuickStartSection />
        </div>
    )
}
