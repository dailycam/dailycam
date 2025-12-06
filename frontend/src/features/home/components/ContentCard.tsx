import { Youtube, FileText, Newspaper, ArrowRight, PlayCircle, Flame } from 'lucide-react'
import { RecommendedLink } from '../types'

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

export const ContentCard = ({ link, showViews = false }: { link: RecommendedLink; showViews?: boolean }) => {
    const config = typeConfig[link.type]

    // 썸네일 URL 검증 및 수정
    const getThumbnailUrl = (url?: string): string | undefined => {
        if (!url) return undefined

        // 이미 http/https로 시작하면 그대로 사용
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
        }

        // //로 시작하면 https: 추가
        if (url.startsWith('//')) {
            return `https:${url}`
        }

        // 그 외의 경우 https:// 추가
        if (url.includes('.')) {
            return `https://${url}`
        }

        // 유효하지 않은 URL
        return undefined
    }

    // 블로그 타입일 때 썸네일이 없으면 기본 이미지 사용
    const getDefaultThumbnail = (type: string): string | undefined => {
        if (type === 'blog') {
            return '/images/blog-thumbnail.svg'
        }
        return undefined
    }

    const thumbnailUrl = getThumbnailUrl(link.thumbnail) || getDefaultThumbnail(link.type)

    return (
        <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-0 border-0 shadow-md hover:shadow-xl transition-all overflow-hidden group block h-full"
        >
            {/* 썸네일 영역 */}
            <div className={`relative bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} h-40 flex items-center justify-center overflow-hidden`}>
                {/* 썸네일 이미지 */}
                {thumbnailUrl ? (
                    <>
                        <img
                            src={thumbnailUrl}
                            alt={link.title}
                            className="absolute inset-0 w-full h-full object-cover thumbnail-image"
                            onError={(e) => {
                                // 이미지 로드 실패 시 숨기기
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                        {/* 이미지 로드 실패 시 보여줄 기본 아이콘 */}
                        <config.icon className="w-14 h-14 text-gray-300 group-hover:scale-110 transition-transform fallback-icon" />
                    </>
                ) : (
                    <config.icon className="w-14 h-14 text-gray-300 group-hover:scale-110 transition-transform" />
                )}
                <div className={`absolute top-3 left-3 ${config.bg} text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1.5 z-10`}>
                    <config.icon className="w-3.5 h-3.5" />
                    {config.label}
                </div>
                {/* 조회수 표시 */}
                {showViews && link.views && (
                    <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 z-10">
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
