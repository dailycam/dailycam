import { useState } from 'react'
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Lightbulb,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Video,
} from 'lucide-react'
import HighlightCard from '../components/VideoHighlights/HighlightCard'
import VideoPlayer from '../components/VideoHighlights/VideoPlayer'
import { mockVideoHighlights } from '../utils/mockData'

export default function DevelopmentReport() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">발달 리포트</h1>
          <p className="text-gray-600 mt-1">AI가 분석한 아이의 발달 단계 리포트</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            공유
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            다운로드
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary-600" />
            <span className="text-lg font-semibold text-gray-900">
              2024년 11월 11일 (월)
            </span>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* AI Summary */}
      <div className="card bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2">AI 한줄평</h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              "오늘 아이는 전반적으로 안전하게 활동했습니다. 거실 세이프존에서 92%의 시간을 보냈으며,
              주방 데드존에 3회 접근했습니다. 오후 2시경 활동량이 가장 높았고, 모서리 보호대 추가 설치를 권장드립니다."
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-safe rounded-full"></div>
                <span className="text-sm text-gray-700">안전도: <strong>92%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <span className="text-sm text-gray-700">주의 필요: <strong>3건</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="총 모니터링 시간"
          value="8시간 45분"
          change="+1.2시간"
          trend="up"
          icon={Clock}
        />
        <MetricCard
          title="감지된 위험"
          value="3건"
          change="-2건"
          trend="down"
          icon={AlertTriangle}
        />
        <MetricCard
          title="세이프존 체류율"
          value="92%"
          change="+5%"
          trend="up"
          icon={CheckCircle2}
        />
        <MetricCard
          title="활동 지수"
          value="높음"
          change="정상"
          trend="neutral"
          icon={TrendingUp}
        />
      </div>

      {/* Weekly Trend Chart */}

      {/* Risk Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Priority */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">위험도 우선순위</h2>
          <div className="space-y-3">
            <RiskDetailItem
              level="high"
              title="주방 근처 반복 접근"
              description="오후 2:15 - 2:45 사이 3회 접근"
              location="주방 입구 (데드존)"
              time="14:15 - 14:45"
            />
            <RiskDetailItem
              level="medium"
              title="계단 입구 접근"
              description="1회 접근, 약 2분간 체류"
              location="계단 입구"
              time="11:30"
            />
            <RiskDetailItem
              level="low"
              title="가구 모서리 접촉"
              description="거실 테이블 모서리 근접"
              location="거실"
              time="13:20"
            />
          </div>
        </div>

        {/* Time-based Analysis */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">시간대별 활동</h2>
          <div className="space-y-4">
            <TimeSlot
              time="09:00 - 12:00"
              activity="낮은 활동량"
              safetyScore={95}
              incidents={0}
            />
            <TimeSlot
              time="12:00 - 15:00"
              activity="높은 활동량"
              safetyScore={85}
              incidents={3}
            />
            <TimeSlot
              time="15:00 - 18:00"
              activity="중간 활동량"
              safetyScore={92}
              incidents={0}
            />
          </div>
        </div>
      </div>

      {/* Action Recommendations */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">즉시 실행 리스트</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionRecommendation
            priority="high"
            title="주방 안전 게이트 설치"
            description="아이가 주방 데드존에 자주 접근하고 있습니다. 안전 게이트 설치를 권장합니다."
            estimatedCost="3-5만원"
            difficulty="쉬움"
          />
          <ActionRecommendation
            priority="high"
            title="거실 테이블 모서리 보호대 추가"
            description="충돌 위험이 감지되었습니다. 모서리 보호대를 추가로 설치하세요."
            estimatedCost="1-2만원"
            difficulty="매우 쉬움"
          />
          <ActionRecommendation
            priority="medium"
            title="계단 입구 차단 강화"
            description="계단 접근이 감지되었습니다. 기존 게이트의 잠금을 확인하세요."
            estimatedCost="무료"
            difficulty="쉬움"
          />
          <ActionRecommendation
            priority="low"
            title="세이프존 범위 재검토"
            description="활동 패턴이 변화했습니다. 세이프존 범위 조정을 고려하세요."
            estimatedCost="무료"
            difficulty="쉬움"
          />
        </div>
      </div>

      {/* Video Highlights */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary-600" />
              하이라이트 영상
            </h2>
            <p className="text-sm text-gray-500 mt-1">위험 상황이 발생한 순간을 자동으로 편집했습니다</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockVideoHighlights.map((highlight) => (
            <HighlightCard
              key={highlight.id}
              {...highlight}
              onPlay={() => setSelectedVideo(highlight.id)}
            />
          ))}
        </div>
      </div>

      {/* Location Heatmap Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">공간별 활동 히트맵</h2>
          <a href="/analytics" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            상세 분석 보기 →
          </a>
        </div>
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">히트맵 시각화 영역</p>
          <p className="text-sm text-gray-500 mt-1">
            실제 구현 시 Canvas 또는 SVG로 공간별 활동 빈도를 표시
          </p>
        </div>
      </div>

      {/* Daily Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryStatCard label="총 이동 거리" value="약 2.3km" />
        <SummaryStatCard label="평균 활동 강도" value="중간" />
        <SummaryStatCard label="낮잠 시간" value="2시간 15분" />
        <SummaryStatCard label="안전 점수" value="A+" />
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          title={mockVideoHighlights.find(h => h.id === selectedVideo)?.title || ''}
          videoUrl={mockVideoHighlights.find(h => h.id === selectedVideo)?.videoUrl}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  )
}

// Metric Card Component
function MetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: any
}) {
  const trendColors = {
    up: 'text-safe',
    down: 'text-danger',
    neutral: 'text-gray-500',
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Clock

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-5 h-5 text-gray-600" />
        <TrendIcon className={`w-4 h-4 ${trendColors[trend]}`} />
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className={`text-xs ${trendColors[trend]}`}>{change}</p>
    </div>
  )
}

// Risk Detail Item Component
function RiskDetailItem({
  level,
  title,
  description,
  location,
  time,
}: {
  level: 'high' | 'medium' | 'low'
  title: string
  description: string
  location: string
  time: string
}) {
  const levelConfig = {
    high: { color: 'border-danger-500 bg-danger-50', badge: 'bg-danger text-white' },
    medium: { color: 'border-warning-500 bg-warning-50', badge: 'bg-warning text-white' },
    low: { color: 'border-gray-300 bg-gray-50', badge: 'bg-gray-400 text-white' },
  }

  const config = levelConfig[level]

  return (
    <div className={`p-4 border-l-4 rounded-lg ${config.color}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className={`text-xs px-2 py-1 rounded ${config.badge}`}>
          {level === 'high' ? '높음' : level === 'medium' ? '중간' : '낮음'}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-3">{description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {location}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {time}
        </div>
      </div>
    </div>
  )
}

// Time Slot Component
function TimeSlot({
  time,
  activity,
  safetyScore,
  incidents,
}: {
  time: string
  activity: string
  safetyScore: number
  incidents: number
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-900">{time}</span>
        <span className="text-xs text-gray-600">{activity}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>안전도</span>
            <span className="font-semibold">{safetyScore}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${safetyScore >= 90 ? 'bg-safe' : safetyScore >= 70 ? 'bg-warning' : 'bg-danger'
                }`}
              style={{ width: `${safetyScore}%` }}
            ></div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">위험</p>
          <p className="text-sm font-semibold text-gray-900">{incidents}건</p>
        </div>
      </div>
    </div>
  )
}

// Action Recommendation Component
function ActionRecommendation({
  priority,
  title,
  description,
  estimatedCost,
  difficulty,
}: {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimatedCost: string
  difficulty: string
}) {
  const priorityConfig = {
    high: { color: 'border-danger-500', badge: 'bg-danger' },
    medium: { color: 'border-warning-500', badge: 'bg-warning' },
    low: { color: 'border-gray-300', badge: 'bg-gray-400' },
  }

  const config = priorityConfig[priority]

  return (
    <div className={`p-4 border-l-4 rounded-lg bg-white shadow-sm ${config.color}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex-1">{title}</h3>
        <span className={`text-xs px-2 py-1 rounded text-white ${config.badge}`}>
          {priority === 'high' ? '긴급' : priority === 'medium' ? '권장' : '선택'}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-3">{description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span>💰 {estimatedCost}</span>
        <span>🔧 {difficulty}</span>
      </div>
    </div>
  )
}
// Summary Stat Card Component
function SummaryStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}

