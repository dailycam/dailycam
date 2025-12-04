import { useState, useEffect } from 'react'
import { Newspaper } from 'lucide-react'
import {
    getRecommendedVideos,
    getRecommendedBlogs,
    getTrendingContent,
    searchContent
} from '../lib/api'
import { getAuthToken } from '../lib/auth'
import { RecommendedLink } from '../features/home/types'
import {
    POPULAR_KEYWORDS,
    HIGHLIGHT_MOMENTS,
    NEWS_LINKS
} from '../features/home/constants'
import { HighlightSection } from '../features/home/components/HighlightSection'
import { SearchSection } from '../features/home/components/SearchSection'
import { TrendingSection } from '../features/home/components/TrendingSection'
import { VideoRecommendationSection } from '../features/home/components/VideoRecommendationSection'
import { BlogRecommendationSection } from '../features/home/components/BlogRecommendationSection'
import { QuickStartSection } from '../features/home/components/QuickStartSection'
import { RecommendationSection } from '../features/home/components/RecommendationSection'

export default function AppHome() {
    const [selectedCategory, setSelectedCategory] = useState<string>('전체')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [userInfo, setUserInfo] = useState<{ child_name?: string } | null>(null)

    // AI 추천 콘텐츠 state
    const [recommendedVideos, setRecommendedVideos] = useState<RecommendedLink[]>([])
    const [recommendedBlogs, setRecommendedBlogs] = useState<RecommendedLink[]>([])
    const [trendingContent, setTrendingContent] = useState<RecommendedLink[]>([])
    const [contentLoading, setContentLoading] = useState(true)

    // 검색 결과 state
    const [searchResults, setSearchResults] = useState<RecommendedLink[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchFilter, setSearchFilter] = useState<'all' | 'youtube' | 'blog'>('all')

    // 더보기 기능을 위한 표시 개수 state
    const [visibleVideosCount, setVisibleVideosCount] = useState(5)
    const [visibleBlogsCount, setVisibleBlogsCount] = useState(5)
    const [visibleTrendingCount, setVisibleTrendingCount] = useState(5)

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

    // AI 추천 콘텐츠 가져오기
    useEffect(() => {
        async function loadAIContent() {
            try {
                setContentLoading(true)

                // 병렬로 모든 콘텐츠 가져오기
                const [videos, blogs, trending] = await Promise.all([
                    getRecommendedVideos(),
                    getRecommendedBlogs(),
                    getTrendingContent()
                ])

                setRecommendedVideos(videos)
                setRecommendedBlogs(blogs)
                setTrendingContent(trending)

                console.log('AI 추천 콘텐츠 로드 완료:', { videos, blogs, trending })
            } catch (error) {
                console.error('AI 콘텐츠 로드 실패:', error)
                // 에러 시 기본 콘텐츠 사용 (fallback은 API 함수에서 처리)
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
            setSearchQuery(query); // UI 업데이트를 위해 상태 변경
        }

        if (!targetQuery.trim() || targetQuery.trim().length < 2) {
            setSearchResults([])
            return
        }

        try {
            setIsSearching(true)
            setSearchFilter('all') // 검색 시 필터 초기화
            const results = await searchContent(targetQuery.trim())
            setSearchResults(results)
        } catch (error) {
            console.error('검색 실패:', error)
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }

    const filteredNews = selectedCategory === '전체'
        ? NEWS_LINKS
        : NEWS_LINKS.filter(link => link.category === selectedCategory)

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

            {/* 4. 이번 주 인기 영상 (유튜브) */}
            <VideoRecommendationSection
                recommendedVideos={recommendedVideos}
                visibleVideosCount={visibleVideosCount}
                setVisibleVideosCount={setVisibleVideosCount}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
            />

            {/* 5. 육아 꿀팁 (블로그) */}
            <BlogRecommendationSection
                recommendedBlogs={recommendedBlogs}
                visibleBlogsCount={visibleBlogsCount}
                setVisibleBlogsCount={setVisibleBlogsCount}
            />

            {/* 6. 육아 뉴스 & 정보 (기존 RecommendationSection 재사용) */}
            <RecommendationSection
                title="육아 뉴스 & 정보"
                icon={Newspaper}
                iconColorClass="from-orange-500 to-orange-600"
                links={filteredNews}
                emptyMessage="해당 카테고리의 뉴스 기사가 없습니다."
                delay={0.5}
            />

            {/* 7. 빠른 시작 */}
            <QuickStartSection />
        </div>
    )
}
