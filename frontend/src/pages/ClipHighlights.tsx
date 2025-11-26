import { useState } from 'react'
import {
  Download,
  Share2,
  Play,
  TrendingDown,
  AlertCircle,
  Activity,
  Smile,
  Baby,
  ChevronRight,
} from 'lucide-react'

// 목 데이터 타입 정의
interface ClipHighlight {
  id: string
  title: string
  category: '발달 성장' | '안전 알림'
  description: string
  timestamp: string
  duration: string
  thumbnailUrl: string
  icon: any
}

// 목 데이터
const mockClipHighlights: ClipHighlight[] = [
  {
    id: '1',
    title: '세영이 처음으로 20미터 이동',
    category: '발달 성장',
    description: '아기가 배밀이 하면서 20미터를 이동했습니다. 근육 발달의 중요한 이정표입니다.',
    timestamp: '2024-11-19 15:23',
    duration: '10초',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=300&fit=crop',
    icon: Activity,
  },
  {
    id: '2',
    title: '혼자 중기 시도',
    category: '발달 성장',
    description: '아기가 혼자로 중기 시도하는 모습이 포착되었습니다. 식사 훈련이 잘 진행되고 있습니다.',
    timestamp: '2024-11-19 08:25',
    duration: '8초',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&h=300&fit=crop',
    icon: Baby,
  },
  {
    id: '3',
    title: '다양한 음성의 옹알이',
    category: '발달 성장',
    description: '다양한 음성의 옹알이가 들렸습니다. 언어 발달의 긍정적 신호입니다.',
    timestamp: '2024-11-19 12:18',
    duration: '5초',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
    icon: Smile,
  },
  {
    id: '4',
    title: '스스로 일어서기 시도',
    category: '발달 성장',
    description: '넘어졌을 때 스스로 물건을 잡고 일어나려는 모습이 관찰되었습니다.',
    timestamp: '2024-11-19 16:15',
    duration: '12초',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop',
    icon: TrendingDown,
  },
  {
    id: '5',
    title: '위험 물건 접근 감지',
    category: '안전 알림',
    description: '아기가 위험한 물건에 손을 뻗는 모습이 포착되었습니다. 주의가 필요합니다.',
    timestamp: '2024-11-18 09:44',
    duration: '7초',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519689373023-dd07c7988603?w=400&h=300&fit=crop',
    icon: AlertCircle,
  },
]

export default function ClipHighlights() {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')

  const categories = ['전체', '발달 성장', '안전 알림']

  const filteredHighlights =
    selectedCategory === '전체'
      ? mockClipHighlights
      : mockClipHighlights.filter((h) => h.category === selectedCategory)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">클립 하이라이트</h1>
          <p className="text-gray-600 mt-1">
            AI가 자동으로 생성한 클립을 손쉽게 확인하세요
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="card">
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === category
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="card bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              발달 클립 하이라이트
            </h2>
            <p className="text-gray-800 leading-relaxed">
              AI가 자동으로 생성한 클립을 손쉽게 확인하세요. 이벤트 발생 시
              전후 5초 정도를 자동으로 잘라서 보여줍니다. 중요한 순간을 놓치지
              마세요!
            </p>
          </div>
        </div>
      </div>

      {/* Highlights List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          발달 클립 하이라이트
        </h2>

        {filteredHighlights.length === 0 ? (
          <div className="card text-center py-12">
            <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              해당 카테고리의 클립이 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHighlights.map((highlight) => (
              <ClipHighlightCard key={highlight.id} highlight={highlight} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Clip Highlight Card Component
function ClipHighlightCard({ highlight }: { highlight: ClipHighlight }) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case '발달 성장':
        return 'bg-emerald-100 text-emerald-700'
      case '안전 알림':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="card hover:shadow-lg transition-all cursor-pointer group">
      <div className="flex items-start gap-4">
        {/* Video Thumbnail */}
        <div className="relative w-32 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-900 shadow-md group">
          <img
            src={highlight.thumbnailUrl}
            alt={highlight.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 이미지 로드 실패 시 대체 배경
              e.currentTarget.style.display = 'none'
            }}
          />
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-gray-900 ml-1" />
            </div>
          </div>
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {highlight.duration}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                {highlight.title}
              </h3>
              <span
                className={`inline-block text-xs px-2 py-1 rounded ${getCategoryColor(
                  highlight.category
                )}`}
              >
                {highlight.category}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors flex-shrink-0" />
          </div>

          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {highlight.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                🕐 {highlight.timestamp}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // 다운로드 로직
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="다운로드"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // 공유 로직
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="공유"
              >
                <Share2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
