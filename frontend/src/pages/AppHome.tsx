import { useState, useEffect } from 'react'
import {
    Youtube,
    FileText,
    Newspaper,
    Sparkles,
    Hash,
    ChevronRight,
    Search,
    Lightbulb,
    Baby,
    Calendar,
} from 'lucide-react'
import { motion } from 'motion/react'
import { getDashboardData, type DashboardData } from '../lib/api'
import { RecommendationSection } from '../features/home/components/RecommendationSection'
import { YOUTUBE_LINKS, BLOG_LINKS, NEWS_LINKS, CATEGORIES } from '../features/home/constants'

export default function AppHome() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState<string>('전체')
    const [searchQuery, setSearchQuery] = useState<string>('')

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
        </div>
    )
}
