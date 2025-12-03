import { useState, useEffect } from 'react'
import {
    Youtube,
    FileText,
    Newspaper,
    Sparkles,
    Hash,
    ChevronRight,
    Search,
    TrendingUp,
    Shield,
    Video,
    PlayCircle,
    ArrowRight,
    Flame,
} from 'lucide-react'
import { motion } from 'motion/react'
import { getDashboardData, type DashboardData } from '../lib/api'
import { RecommendationSection } from '../features/home/components/RecommendationSection'
import { YOUTUBE_LINKS, BLOG_LINKS, NEWS_LINKS, CATEGORIES } from '../features/home/constants'
import { getAuthToken } from '../lib/auth'

// 하이라이트 순간 타입
type HighlightMoment = {
    id: string
    title: string
    time: string
    description: string
    thumbnail: string  // 썸네일 이미지 URL
}

// 임시 추천 링크 데이터 타입 (for Trending Content which is common)
type RecommendedLink = {
    id: string
    type: 'youtube' | 'blog' | 'news'
    title: string
    description: string
    thumbnail?: string
    url: string
    tags: string[]
    category: string
    views?: string
}

// 콘텐츠 카드 컴포넌트 (Used in Trending Content)
const ContentCard = ({ link, showViews = false }: { link: RecommendedLink; showViews?: boolean }) => {
    // ... (Keep the ContentCard implementation from dev/common part if needed, or if HEAD refactored it out? 
    // HEAD imports RecommendationSection, but Trending Content (Section 3) is common and uses ContentCard?
    // Let's check if ContentCard is defined in HEAD. 
    // In view_file, ContentCard definition was inside `dev` block (lines 53-134).
    // HEAD block (lines 24-25) did NOT define ContentCard.
    // But Section 3 (lines 443-466) uses `ContentCard`.
    // So HEAD *must* have ContentCard defined or imported?
    // Wait, if Section 3 is outside conflict markers, it means it's in HEAD too.
    // But if ContentCard definition is in `dev` block, then HEAD doesn't have it?
    // This implies Section 3 might be using a *different* ContentCard or I misread the conflict markers.
    // Let's look at lines 23-26 (HEAD imports) vs 27-134 (dev imports + types + ContentCard).
    // Yes, ContentCard is defined in `dev` block.
    // If HEAD uses Section 3, it must have ContentCard.
    // Maybe HEAD imported it?
    // HEAD imports: `RecommendationSection`.
    // Maybe `RecommendationSection` is used in Section 3?
    // No, Section 3 uses `<ContentCard ... />`.
    // So HEAD *must* be missing ContentCard definition if I just take HEAD imports.
    // This suggests Section 3 *was* modified in HEAD to use something else, OR Section 3 is *not* in HEAD and I misread the markers.
    // Let's re-examine the markers.
    // Markers:
    // <<<<<<< HEAD (lines 23-26)
    // ======= (line 27)
    // ... ContentCard definition ... (lines 53-134)
    // >>>>>>> (line 134)
    //
    // Then lines 136+ (AppHome component).
    // Then lines 443-466 (Section 3).
    // If Section 3 is outside markers, it exists in both.
    // If HEAD doesn't define ContentCard, then HEAD is broken?
    // Or maybe HEAD imported `ContentCard` from somewhere else?
    // HEAD imports: `RecommendationSection`, `YOUTUBE_LINKS`...
    // No `ContentCard` import.
    // Maybe `RecommendationSection` *is* the new way, and Section 3 should have been updated?
    // But Section 3 is "Trending Content" (엄마들이 가장 많이 본).
    // RecommendationSection is for "Youtube", "Blog", "News".
    // Maybe I should *keep* ContentCard definition from `dev` so Section 3 works.
    // Or maybe HEAD removed Section 3?
    // If Section 3 is *outside* markers, HEAD has it.
    // This is confusing. Maybe `git` context is misleading.
    // Let's assume I need `ContentCard` for Section 3.
    // I will include `ContentCard` definition.

    const typeConfig = {
        youtube: {
            bg: 'bg-red-500',
            label: 'YouTube',
            icon: Youtube,
            gradientFrom: 'from-red-50',
            gradientTo: 'to-pink-50'
        },
        blog: {
            bg: 'bg-emerald-500',
            label: 'Blog',
            icon: FileText,
            gradientFrom: 'from-white',
            gradientTo: 'to-emerald-50'
        },
        news: {
            bg: 'bg-orange-500',
            label: 'News',
            icon: Newspaper,
            gradientFrom: 'from-orange-50',
            gradientTo: 'to-yellow-50'
        }
    }

    const config = typeConfig[link.type]

    return (
        <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-0 border-0 shadow-md hover:shadow-xl transition-all overflow-hidden group block h-full"
        >
            {/* 썸네일 영역 */}
            <div className={`relative bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} h-40 flex items-center justify-center overflow-hidden`}>
                <config.icon className="w-14 h-14 text-gray-300 group-hover:scale-110 transition-transform" />
                <div className={`absolute top-3 left-3 ${config.bg} text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1.5`}>
                    <config.icon className="w-3.5 h-3.5" />
                    {config.label}
                </div>
                {/* 조회수 표시 */}
                {showViews && link.views && (
                    <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {link.views}
                    </div>
                )}
                {/* 재생 아이콘 오버레이 */}
                {link.type === 'youtube' && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                    </div>
                )}
            </div>

            {/* 콘텐츠 영역 */}
            <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors flex items-start justify-between gap-2 leading-tight">
                    <span className="line-clamp-2 flex-1">{link.title}</span>
                    {/* ExternalLink is not imported in HEAD, need to import it or use ArrowRight */}
                    <ArrowRight className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-primary-500" />
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                    {link.description}
                </p>

                {/* 태그 */}
                <div className="flex flex-wrap gap-1.5">
                    {link.tags.slice(0, 3).map((tag, idx) => (
                        <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>
        </a>
    )
}

export default function AppHome() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState<string>('전체')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [userInfo, setUserInfo] = useState<{ child_name?: string } | null>(null)

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

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const dashboard = await getDashboardData(7)
                setDashboardData(dashboard)
            } catch (err: any) {
                console.error('대시보드 데이터 로딩 오류:', err)
                setDashboardData(null)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // 오늘의 하이라이트 순간 (썸네일 이미지 사용)
    const highlightMoments: HighlightMoment[] = [
        {
            id: '1',
            title: '처음으로 웃은 순간',
            time: '오전 10:23',
            description: '엄마 얼굴 보고 활짝 웃었어요',
            thumbnail: '/placeholder-baby-smile.jpg'  // 실제로는 캡처된 이미지
        },
        {
            id: '2',
            title: '배밀이 연습 중',
            time: '오후 2:15',
            description: '2미터 이동 성공!',
            thumbnail: '/placeholder-baby-crawl.jpg'
        },
        {
            id: '3',
            title: '엄마를 쳐다보는 눈빛',
            time: '오후 4:50',
            description: '엄마 목소리에 반응해요',
            thumbnail: '/placeholder-baby-look.jpg'
        }
    ]

    // 인기 검색어
    const popularKeywords = ['배밀이', '이유식', '수면교육', '안전사고', '발달체크', '놀이법']

    // 엄마들이 가장 많이 본 콘텐츠 (유튜브 + 블로그 혼합)
    const trendingContent: RecommendedLink[] = [
        {
            id: 'trend1',
            type: 'youtube',
            title: '6개월 아기 발달 체크리스트 완벽 정리',
            description: '우리 아기가 정상적으로 발달하고 있는지 소아과 전문의가 알려드립니다',
            url: 'https://youtube.com/example',
            tags: ['발달', '체크리스트', '필수'],
            category: '발달',
            views: '12만'
        },
        {
            id: 'trend2',
            type: 'blog',
            title: '이유식 초기 완벽 가이드 - 초보맘 필독',
            description: '이유식 언제, 어떻게 시작할까? 단계별 완벽 정리',
            url: 'https://blog.example.com/baby-food',
            tags: ['이유식', '육아', '가이드'],
            category: '영양',
            views: '8.5만'
        },
        {
            id: 'trend3',
            type: 'youtube',
            title: '아기 수면교육 완벽 가이드 - 통잠 자는 법',
            description: '밤에 푹 자는 아기로 만드는 수면교육 방법',
            url: 'https://youtube.com/example2',
            tags: ['수면', '교육', '통잠'],
            category: '수면',
            views: '15만'
        },
        {
            id: 'trend4',
            type: 'blog',
            title: '아기 안전사고 예방 완벽 가이드',
            description: '집안에서 발생할 수 있는 안전사고 체크리스트',
            url: 'https://blog.example.com/safety',
            tags: ['안전', '예방', '체크'],
            category: '안전',
            views: '6.2만'
        },
    ]

    const filteredYoutube = selectedCategory === '전체'
        ? YOUTUBE_LINKS
        : YOUTUBE_LINKS.filter(link => link.category === selectedCategory)

    const filteredBlog = selectedCategory === '전체'
        ? BLOG_LINKS
        : BLOG_LINKS.filter(link => link.category === selectedCategory)

    const filteredNews = selectedCategory === '전체'
        ? NEWS_LINKS
        : NEWS_LINKS.filter(link => link.category === selectedCategory)

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen bg-gradient-to-br from-green-50/20 via-emerald-50/10 to-teal-50/20">
            {/* 1. 지수의 하루 - 오늘의 하이라이트 (썸네일 이미지) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-10"
            >
                <div className="card p-8 bg-gradient-to-br from-white via-green-50 to-emerald-50 border-0 shadow-md">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-sm">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{userInfo?.child_name || '우리 아이'}의 하루</h2>
                            <p className="text-sm text-gray-600">오늘의 특별한 순간</p>
                        </div>
                    </div>

                    {/* 오늘의 하이라이트 3장 (썸네일 이미지) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {highlightMoments.map((moment, index) => (
                            <motion.div
                                key={moment.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group border border-green-100"
                            >
                                {/* 썸네일 이미지 */}
                                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                    {/* 임시 플레이스홀더 - 실제로는 캡처된 이미지 */}
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Video className="w-16 h-16" />
                                    </div>
                                    {/* 시간 오버레이 */}
                                    <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                                        {moment.time}
                                    </div>
                                    {/* 재생 아이콘 */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                        <PlayCircle className="w-12 h-12 text-white" />
                                    </div>
                                </div>
                                {/* 설명 */}
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                                        {moment.title}
                                    </h3>
                                    <p className="text-sm text-gray-600">{moment.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>

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
                                onClick={() => setSearchQuery(keyword)}
                                className="px-4 py-2 bg-gray-100 hover:bg-primary-100 text-gray-700 hover:text-primary-700 rounded-full text-sm font-medium transition-all hover:scale-105"
                            >
                                #{keyword}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 3. 엄마들이 가장 많이 본 (NEW) */}
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trendingContent.map((link) => (
                        <ContentCard key={link.id} link={link} showViews={true} />
                    ))}
                </div>
            </motion.div>

            {/* 4. 이번 주 인기 영상 (유튜브) - Refactored Version */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-10"
            >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* 카테고리 필터 */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1">
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
                </div>
            </motion.div>

            <RecommendationSection
                title="추천 유튜브 영상"
                icon={Youtube}
                iconColorClass="from-red-500 to-red-600"
                links={filteredYoutube}
                emptyMessage="해당 카테고리의 유튜브 영상이 없습니다."
                delay={0.3}
            />

            <RecommendationSection
                title="추천 블로그 포스트"
                icon={FileText}
                iconColorClass="from-purple-500 to-purple-600"
                links={filteredBlog}
                emptyMessage="해당 카테고리의 블로그 포스트가 없습니다."
                delay={0.4}
            />

            <RecommendationSection
                title="육아 뉴스 & 정보"
                icon={Newspaper}
                iconColorClass="from-orange-500 to-orange-600"
                links={filteredNews}
                emptyMessage="해당 카테고리의 뉴스 기사가 없습니다."
                delay={0.5}
            />

            {/* 6. 빠른 시작 (From dev) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-10"
            >
                <h2 className="text-xl font-bold mb-4 text-gray-700">빠른 시작</h2>
                <div className="grid lg:grid-cols-3 gap-4">
                    <a
                        href="/video-analysis"
                        className="card p-6 bg-gradient-to-br from-cyan-100 to-blue-100 border-0 hover:shadow-lg transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-cyan-700 mb-1">분석하기</p>
                                <h3 className="text-xl font-bold text-cyan-800">영상 분석</h3>
                            </div>
                            <Video className="w-8 h-8 text-cyan-600 group-hover:scale-110 transition-transform" />
                        </div>
                    </a>
                    <a
                        href="/development-report"
                        className="card p-6 bg-gradient-to-br from-blue-100 to-indigo-100 border-0 hover:shadow-lg transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-700 mb-1">발달 분석</p>
                                <h3 className="text-xl font-bold text-blue-800">발달 리포트</h3>
                            </div>
                            <TrendingUp className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
                        </div>
                    </a>
                    <a
                        href="/safety-report"
                        className="card p-6 bg-gradient-to-br from-green-100 to-emerald-100 border-0 hover:shadow-lg transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-700 mb-1">안전 분석</p>
                                <h3 className="text-xl font-bold text-green-800">안전 리포트</h3>
                            </div>
                            <Shield className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
                        </div>
                    </a>
                </div>
            </motion.div>
        </div>
    )
}
