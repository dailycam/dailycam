import { Youtube, FileText, Newspaper, ExternalLink } from 'lucide-react'
import { RecommendedLink } from '../types'

export const ContentCard = ({ link }: { link: RecommendedLink }) => {
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
