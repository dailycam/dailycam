import { useState } from 'react'
import {
  AlertTriangle,
  Shield,
  Clock,
  TrendingUp,
  Camera,
  Activity,
  CheckCircle2,
  XCircle,
  Video,
} from 'lucide-react'
import SafetyTrendChart from '../components/Charts/SafetyTrendChart'
import HighlightCard from '../components/VideoHighlights/HighlightCard'
import VideoPlayer from '../components/VideoHighlights/VideoPlayer'
import { generateWeeklySafetyData, mockVideoHighlights } from '../utils/mockData'

export default function Dashboard() {
  const weeklyData = generateWeeklySafetyData()
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  
  const todayHighlights = mockVideoHighlights.slice(0, 3)
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-600 mt-1">오늘의 안전 현황을 한눈에 확인하세요</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="오늘의 안전도"
          value="92%"
          change="+5%"
          icon={Shield}
          color="safe"
        />
        <StatCard
          title="감지된 위험"
          value="3건"
          change="-2건"
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="모니터링 시간"
          value="8.5시간"
          change="+1.2시간"
          icon={Clock}
          color="primary"
        />
        <StatCard
          title="활동 패턴"
          value="정상"
          change="안정적"
          icon={Activity}
          color="safe"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's AI Summary */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AI 한줄평</h2>
            <span className="text-xs text-gray-500">오늘 오후 3:24 업데이트</span>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <p className="text-gray-800 text-base leading-relaxed mb-4">
              "오늘 아이는 거실에서 안전하게 활동했어요. 다만 오후 2시경 주방 근처(데드존)에 
              3회 접근했습니다. 모서리 보호대 설치를 권장드립니다."
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-safe" />
              <span>전반적으로 안전한 하루였습니다</span>
            </div>
          </div>
        </div>

        {/* Camera Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">카메라 상태</h2>
          <div className="space-y-3">
            <CameraStatusItem name="거실 카메라" status="online" />
            <CameraStatusItem name="아이방 카메라" status="online" />
            <CameraStatusItem name="주방 카메라" status="offline" />
          </div>
          <button className="w-full mt-4 text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" />
            카메라 관리
          </button>
        </div>
      </div>

      {/* Risk Priority & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Priority */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">위험도 우선순위</h2>
          <div className="space-y-3">
            <RiskItem
              level="high"
              title="주방 근처 반복 접근"
              time="오후 2:15 - 2:45"
              count={3}
            />
            <RiskItem
              level="medium"
              title="계단 입구 접근"
              time="오전 11:30"
              count={1}
            />
            <RiskItem
              level="low"
              title="가구 모서리 접촉"
              time="오후 1:20"
              count={2}
            />
          </div>
        </div>

        {/* Immediate Action List */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">즉시 실행 리스트</h2>
          <div className="space-y-3">
            <ActionItem
              priority="high"
              title="주방 출입문 안전 게이트 설치"
              description="아이가 주방에 자주 접근하고 있습니다"
            />
            <ActionItem
              priority="medium"
              title="거실 테이블 모서리 보호대 추가"
              description="충돌 위험이 감지되었습니다"
            />
            <ActionItem
              priority="low"
              title="세이프존 범위 재설정 검토"
              description="활동 패턴이 변화했습니다"
            />
          </div>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">주간 안전도 추이</h2>
            <p className="text-sm text-gray-500 mt-1">지난 7일간의 안전도 변화</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-safe rounded-full"></div>
              <span className="text-gray-600">안전도</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <SafetyTrendChart data={weeklyData} />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">평균 안전도</p>
              <p className="text-lg font-bold text-gray-900">89%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">최고 안전도</p>
              <p className="text-lg font-bold text-safe">95%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">개선율</p>
              <p className="text-lg font-bold text-primary-600">+12%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Video Highlights */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary-600" />
              오늘의 하이라이트 영상
            </h2>
            <p className="text-sm text-gray-500 mt-1">AI가 자동으로 생성한 주요 순간</p>
          </div>
          <a href="/daily-report" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            전체 보기 →
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {todayHighlights.map((highlight) => (
            <HighlightCard
              key={highlight.id}
              {...highlight}
              onPlay={() => setSelectedVideo(highlight.id)}
            />
          ))}
        </div>

        {todayHighlights.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">오늘은 아직 하이라이트 영상이 없습니다</p>
            <p className="text-sm text-gray-500 mt-1">위험 상황 감지 시 자동으로 생성됩니다</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionButton
          title="실시간 모니터링"
          description="지금 아이의 모습 확인"
          href="/live-monitoring"
        />
        <QuickActionButton
          title="오늘의 리포트"
          description="상세 분석 보기"
          href="/daily-report"
        />
        <QuickActionButton
          title="히트맵 분석"
          description="위험 구간 확인"
          href="/analytics"
        />
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          title={todayHighlights.find(h => h.id === selectedVideo)?.title || ''}
          videoUrl={todayHighlights.find(h => h.id === selectedVideo)?.videoUrl}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  change: string
  icon: any
  color: 'safe' | 'warning' | 'primary'
}) {
  const colorClasses = {
    safe: 'bg-safe-50 text-safe-700',
    warning: 'bg-warning-50 text-warning-700',
    primary: 'bg-primary-50 text-primary-700',
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{change}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

// Camera Status Item
function CameraStatusItem({ name, status }: { name: string; status: 'online' | 'offline' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Camera className="w-5 h-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {status === 'online' ? (
          <>
            <div className="w-2 h-2 bg-safe rounded-full animate-pulse"></div>
            <span className="text-xs text-safe-dark font-medium">온라인</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-xs text-gray-500 font-medium">오프라인</span>
          </>
        )}
      </div>
    </div>
  )
}

// Risk Item
function RiskItem({
  level,
  title,
  time,
  count,
}: {
  level: 'high' | 'medium' | 'low'
  title: string
  time: string
  count: number
}) {
  const levelConfig = {
    high: { color: 'bg-danger text-white', icon: XCircle },
    medium: { color: 'bg-warning text-white', icon: AlertTriangle },
    low: { color: 'bg-gray-400 text-white', icon: AlertTriangle },
  }

  const config = levelConfig[level]
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-lg ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-1">
          {time} · {count}회 발생
        </p>
      </div>
    </div>
  )
}

// Action Item
function ActionItem({
  priority,
  title,
  description,
}: {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
}) {
  const priorityColors = {
    high: 'border-danger-500 bg-danger-50',
    medium: 'border-warning-500 bg-warning-50',
    low: 'border-gray-300 bg-gray-50',
  }

  return (
    <div className={`p-4 border-l-4 rounded-lg ${priorityColors[priority]}`}>
      <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  )
}

// Quick Action Button
function QuickActionButton({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <a
      href={href}
      className="card hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
          {title}
        </h3>
        <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  )
}

