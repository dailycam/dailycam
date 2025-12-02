// frontend/src/pages/AppHome.tsx

import { useState, useEffect } from 'react'
import {
    Youtube,
    FileText,
    Newspaper,
    Sparkles,
    Hash,
    ExternalLink,
    ChevronRight,
    Search,
    Lightbulb,
    Baby,
    Calendar,
} from 'lucide-react'
import { motion } from 'motion/react'
import { getDashboardData, type DashboardData } from '../lib/api'
import { mockDashboardData } from '../utils/mockData'

// 임시 추천 링크 데이터 타입
type RecommendedLink = {
    id: string
    type: 'youtube' | 'blog' | 'news'
    title: string
    description: string
    thumbnail?: string
    url: string
    tags: string[]
    category: string
}

// 콘텐츠 카드 컴포넌트
const ContentCard = ({ link }: { link: RecommendedLink }) => {
    return (
        <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-0 border-0 shadow-sm hover:shadow-md transition-all overflow-hidden group block h-full"
        >
            {/* 썸네일 영역 */}
            {link.type === 'youtube' && (
                <div className="relative bg-gray-200 h-40 flex items-center justify-center">
                    <Youtube className="w-12 h-12 text-gray-400" />
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-semibold">
                        YouTube
                    </div>
                </div>
            )}
            {link.type === 'blog' && (
                <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 h-40 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-400" />
                    <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded font-semibold">
                        Blog
                    </div>
                </div>
            )}
            {link.type === 'news' && (
                <div className="relative bg-gradient-to-br from-orange-50 to-yellow-50 h-40 flex items-center justify-center">
                    <Newspaper className="w-12 h-12 text-gray-400" />
                    <div className="absolute top-2 left-2 bg-orange-600 text-white text-xs px-2 py-1 rounded font-semibold">
                        News
                    </div>
                </div>
            )}

            {/* 콘텐츠 영역 */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors flex items-start justify-between gap-2">
                    <span className="line-clamp-2">{link.title}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0 text-gray-400" />
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {link.description}
                </p>

                {/* 태그 */}
                <div className="flex flex-wrap gap-1">
                    {link.tags.map((tag, idx) => (
                        <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
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
    const [searchQuery, setSearchQuery] = useState<string>('') // 검색어 state

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const dashboard = await getDashboardData(7)
                setDashboardData(dashboard)
            } catch (err: any) {
                console.error('대시보드 데이터 로딩 오류:', err)
                setDashboardData(mockDashboardData)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">로딩 중...</div>
            </div>
        )
    }

    if (!dashboardData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-600">데이터를 불러올 수 없습니다.</div>
            </div>
        )
    }

    // 유튜브 추천
    const youtubeLinks: RecommendedLink[] = [
        {
            id: 'yt1',
            type: 'youtube',
            title: '6개월 아기 발달 체크리스트',
            description: '우리 아기가 정상적으로 발달하고 있는지 확인해보세요',
            url: 'https://youtube.com/example',
            tags: ['발달', '6개월', '체크리스트'],
            category: '발달'
        },
        {
            id: 'yt2',
            type: 'youtube',
            title: '아기 수면교육 완벽 가이드',
            description: '밤에 푹 자는 아기로 만드는 수면교육 방법',
            url: 'https://youtube.com/example2',
            tags: ['수면', '교육', '밤잠'],
            category: '수면'
        },
        {
            id: 'yt3',
            type: 'youtube',
            title: '이유식 초기 준비물 총정리',
            description: '이유식 시작할 때 꼭 필요한 준비물 리스트',
            url: 'https://youtube.com/example3',
            tags: ['이유식', '준비물', '육아템'],
            category: '영양'
        },
    ]

    // 블로그 추천
    const blogLinks: RecommendedLink[] = [
        {
            id: 'blog1',
            type: 'blog',
            title: '아기 안전사고 예방 가이드',
            description: '집안에서 발생할 수 있는 안전사고를 미리 예방하는 방법',
            url: 'https://blog.example.com/safety-guide',
            tags: ['안전', '예방', '육아팁'],
            category: '안전'
        },
        {
            id: 'blog2',
            type: 'blog',
            title: '이유식 시작 완벽 가이드',
            description: '우리 아기 첫 이유식, 언제 어떻게 시작할까요?',
            url: 'https://blog.example.com/baby-food',
            tags: ['영양', '이유식', '육아'],
            category: '영양'
        },
        {
            id: 'blog3',
            type: 'blog',
            title: '아기랑 놀아주는 방법 100가지',
            description: '집에서 할 수 있는 다양한 놀이 방법',
            url: 'https://blog.example.com/play-ideas',
            tags: ['놀이', '육아', '집콕놀이'],
            category: '놀이'
        },
    ]

    // 뉴스 기사 추천
    const newsLinks: RecommendedLink[] = [
        {
            id: 'news1',
            type: 'news',
            title: '2024년 육아 지원금 정책 총정리',
            description: '올해 달라진 육아휴직 급여와 양육수당 안내',
            url: 'https://news.example.com/childcare-policy',
            tags: ['정책', '지원금', '육아휴직'],
            category: '정책'
        },
        {
            id: 'news2',
            type: 'news',
            title: '소아과 전문의가 알려주는 감기 예방법',
            description: '환절기 우리 아이 건강 지키는 방법',
            url: 'https://news.example.com/cold-prevention',
            tags: ['건강', '질병', '예방'],
            category: '건강'
        },
    ]

    const categories = ['전체', '발달', '안전', '수면', '영양', '놀이']

    const filteredYoutube = selectedCategory === '전체'
        ? youtubeLinks
        : youtubeLinks.filter(link => link.category === selectedCategory)

    const filteredBlog = selectedCategory === '전체'
        ? blogLinks
        : blogLinks.filter(link => link.category === selectedCategory)

    const filteredNews = selectedCategory === '전체'
        ? newsLinks
        : newsLinks.filter(link => link.category === selectedCategory)

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 min-h-screen">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-8"
            >
                <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-primary-100/80 text-primary-700 text-xs font-bold flex items-center gap-1.5 border border-primary-200">
                        <Baby className="w-3.5 h-3.5" />
                        생후 7개월
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/80 text-gray-600 text-xs font-bold flex items-center gap-1.5 border border-gray-200 shadow-sm">
                        <Calendar className="w-3.5 h-3.5" />
                        D+215
                    </span>
                </div>
                <p className="text-gray-500 mb-1">오늘도 함께해요</p>
                <h1 className="text-4xl mb-2 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent">
                    지수는 기분이 아주 좋아요!
                </h1>
                <p className="text-gray-600 leading-relaxed">
                    오늘 하루도 건강하고 안전하게 보냈어요. 특히 배밀이 연습에서 큰 진전을 보였답니다 🎉
                </p>
            </motion.div>

            {/* 오늘의 하이라이트 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">오늘의 하이라이트</h2>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-5 mb-5">
                    {dashboardData.recommendations && dashboardData.recommendations.length > 0 ? (
                        dashboardData.recommendations.map((rec, index) => {
                            const bgColorMap: Record<string, string> = {
                                high: 'bg-danger-light/30',
                                medium: 'bg-primary-100/50',
                                low: 'bg-safe-light/30',
                            }
                            const bgColor = bgColorMap[rec.priority] || 'bg-[#E6F2FF]'

                            return (
                                <div key={index} className={`card p-6 border-0 shadow-sm ${bgColor}`}>
                                    <h3 className="text-lg font-semibold mb-2">{rec.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {rec.description}
                                    </p>
                                </div>
                            )
                        })
                    ) : (
                        <div className="card p-6 border-0 bg-primary-100/50">
                            <h3 className="text-lg font-semibold mb-2">분석을 시작해보세요</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                영상을 업로드하면 AI가 분석 결과를 제공합니다.
                            </p>
                        </div>
                    )}
                </div>

                {/* 발달/안전 리포트 버튼 */}
                <div className="grid lg:grid-cols-2 gap-5">
                    <a
                        href="/development-report"
                        className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white h-14 rounded-2xl flex items-center justify-center font-medium transition-all hover:from-primary-600 hover:to-primary-700 hover:shadow-md"
                    >
                        발달 리포트 자세히 보기
                        <ChevronRight className="w-5 h-5 ml-1" />
                    </a>
                    <a
                        href="/safety-report"
                        className="w-full bg-gradient-to-r from-safe to-safe-dark text-white h-14 rounded-2xl flex items-center justify-center font-medium transition-all hover:from-safe-dark hover:to-safe-dark hover:shadow-md"
                    >
                        안전 리포트 자세히 보기
                        <ChevronRight className="w-5 h-5 ml-1" />
                    </a>
                </div>
            </motion.div>

            {/* 오늘의 육아 팁 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mb-8"
            >
                <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 flex items-start gap-4">
                    <div className="p-2.5 bg-amber-100 rounded-lg flex-shrink-0 text-amber-600">
                        <Lightbulb className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
                            오늘의 육아 팁
                            <span className="text-[10px] bg-amber-200/50 text-amber-700 px-1.5 py-0.5 rounded font-medium">Daily</span>
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            아기가 배밀이를 시작할 때는 바닥에 작은 물건이나 전선이 없는지 수시로 확인해주세요! 호기심이 왕성해지는 시기랍니다. 🌱
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* 카테고리 필터 + 검색창 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-8"
            >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* 카테고리 필터 */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1">
                        <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {categories.map((category) => (
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

                    {/* 웹서치 검색창 */}
                    <div className="relative flex-shrink-0 lg:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="육아 정보 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                        />
                    </div>
                </div>
            </motion.div>

            {/* 1. 유튜브 추천 섹션 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-8 bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
                        <Youtube className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">추천 유튜브 영상</h2>
                    </div>
                </div>

                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                    {filteredYoutube.length > 0 ? (
                        filteredYoutube.map((link) => (
                            <div key={link.id} className="flex-shrink-0 w-80 snap-start">
                                <ContentCard link={link} />
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 text-center py-12">
                            <p className="text-gray-500">해당 카테고리의 유튜브 영상이 없습니다.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* 2. 블로그 추천 섹션 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mb-8 bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">추천 블로그 포스트</h2>
                    </div>
                </div>

                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                    {filteredBlog.length > 0 ? (
                        filteredBlog.map((link) => (
                            <div key={link.id} className="flex-shrink-0 w-80 snap-start">
                                <ContentCard link={link} />
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 text-center py-12">
                            <p className="text-gray-500">해당 카테고리의 블로그 포스트가 없습니다.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* 3. 뉴스 기사 추천 섹션 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mb-8 bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                        <Newspaper className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">육아 뉴스 & 정보</h2>
                    </div>
                </div>

                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                    {filteredNews.length > 0 ? (
                        filteredNews.map((link) => (
                            <div key={link.id} className="flex-shrink-0 w-80 snap-start">
                                <ContentCard link={link} />
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 text-center py-12">
                            <p className="text-gray-500">해당 카테고리의 뉴스 기사가 없습니다.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
