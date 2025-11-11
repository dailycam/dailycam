import { useState } from 'react'
import {
  Camera,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  AlertTriangle,
  Activity,
  Clock,
  MapPin,
} from 'lucide-react'

export default function LiveMonitoring() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState('camera-1')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">실시간 모니터링</h1>
        <p className="text-gray-600 mt-1">AI가 실시간으로 아이의 행동을 분석합니다</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Camera Feed */}
          <div className="card p-0 overflow-hidden">
            <div className="relative bg-gray-900 aspect-video">
              {/* Simulated Live Feed */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Camera className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-base">실시간 카메라 피드</p>
                  <p className="text-sm mt-2">거실 카메라 - LIVE</p>
                </div>
              </div>

              {/* Live Indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-danger/90 text-white px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">LIVE</span>
              </div>

              {/* AI Detection Overlay */}
              <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-safe" />
                  <span>AI 분석 중...</span>
                </div>
              </div>

              {/* Detection Box (Example) */}
              <div className="absolute top-1/3 left-1/3 w-32 h-48 border-4 border-safe rounded-lg">
                <div className="absolute -top-7 left-0 bg-safe text-white text-xs px-2 py-1 rounded">
                  아이 감지됨
                </div>
              </div>

              {/* Zone Warnings */}
              <div className="absolute bottom-20 left-4 right-4 space-y-2">
                <div className="bg-warning/90 text-white px-4 py-2 rounded-lg flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">데드존 근처 접근 감지</span>
                </div>
              </div>

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <span className="text-white text-sm ml-2">오후 3:45:22</span>
                  </div>
                  <button className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Camera Selector */}
          <div className="grid grid-cols-3 gap-3">
            <CameraThumbnail
              id="camera-1"
              name="거실"
              isActive={selectedCamera === 'camera-1'}
              onClick={() => setSelectedCamera('camera-1')}
            />
            <CameraThumbnail
              id="camera-2"
              name="아이방"
              isActive={selectedCamera === 'camera-2'}
              onClick={() => setSelectedCamera('camera-2')}
            />
            <CameraThumbnail
              id="camera-3"
              name="주방"
              isActive={selectedCamera === 'camera-3'}
              onClick={() => setSelectedCamera('camera-3')}
              isOffline
            />
          </div>

          {/* AI Analysis Summary */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">실시간 AI 분석</h3>
            <div className="grid grid-cols-3 gap-4">
              <AnalysisStat
                label="현재 활동"
                value="놀이 중"
                icon={Activity}
                color="safe"
              />
              <AnalysisStat
                label="위험도"
                value="낮음"
                icon={AlertTriangle}
                color="safe"
              />
              <AnalysisStat
                label="위치"
                value="세이프존"
                icon={MapPin}
                color="primary"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Activity Log & Alerts */}
        <div className="space-y-4">
          {/* Real-time Alerts */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">실시간 알림</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              <AlertItem
                type="warning"
                message="데드존 근처 접근"
                time="방금 전"
              />
              <AlertItem
                type="info"
                message="세이프존으로 이동"
                time="2분 전"
              />
              <AlertItem
                type="warning"
                message="가구 모서리 근접"
                time="5분 전"
              />
              <AlertItem
                type="safe"
                message="안전한 활동 중"
                time="10분 전"
              />
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4">활동 타임라인</h3>
            <div className="space-y-4">
              <TimelineItem
                time="15:45"
                activity="거실에서 놀이 중"
                status="safe"
              />
              <TimelineItem
                time="15:30"
                activity="주방 근처 접근"
                status="warning"
              />
              <TimelineItem
                time="15:15"
                activity="낮잠에서 깨어남"
                status="info"
              />
              <TimelineItem
                time="14:00"
                activity="낮잠 시작"
                status="safe"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100">
            <h3 className="text-base font-semibold text-gray-900 mb-3">오늘의 통계</h3>
            <div className="space-y-3">
              <QuickStat label="모니터링 시간" value="8시간 45분" />
              <QuickStat label="감지된 위험" value="3건" />
              <QuickStat label="세이프존 체류" value="92%" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Camera Thumbnail Component
function CameraThumbnail({
  id,
  name,
  isActive,
  onClick,
  isOffline = false,
}: {
  id: string
  name: string
  isActive: boolean
  onClick: () => void
  isOffline?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
        isActive
          ? 'border-primary-500 ring-2 ring-primary-200'
          : 'border-gray-200 hover:border-gray-300'
      } ${isOffline ? 'opacity-50' : ''}`}
    >
      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
        <Camera className="w-8 h-8 text-gray-600" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-2">
        {name}
      </div>
      {isOffline && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-white text-xs font-medium">오프라인</span>
        </div>
      )}
    </button>
  )
}

// Analysis Stat Component
function AnalysisStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  icon: any
  color: 'safe' | 'warning' | 'primary'
}) {
  const colorClasses = {
    safe: 'text-safe',
    warning: 'text-warning',
    primary: 'text-primary-600',
  }

  return (
    <div className="text-center">
      <Icon className={`w-6 h-6 mx-auto mb-2 ${colorClasses[color]}`} />
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

// Alert Item Component
function AlertItem({
  type,
  message,
  time,
}: {
  type: 'warning' | 'info' | 'safe'
  message: string
  time: string
}) {
  const typeConfig = {
    warning: { bg: 'bg-warning-50', icon: 'text-warning', border: 'border-warning-200' },
    info: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    safe: { bg: 'bg-safe-50', icon: 'text-safe', border: 'border-safe-200' },
  }

  const config = typeConfig[type]

  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={`w-4 h-4 mt-0.5 ${config.icon}`} />
        <div className="flex-1">
          <p className="text-sm text-gray-900">{message}</p>
          <p className="text-xs text-gray-500 mt-1">{time}</p>
        </div>
      </div>
    </div>
  )
}

// Timeline Item Component
function TimelineItem({
  time,
  activity,
  status,
}: {
  time: string
  activity: string
  status: 'safe' | 'warning' | 'info'
}) {
  const statusColors = {
    safe: 'bg-safe',
    warning: 'bg-warning',
    info: 'bg-blue-500',
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
        <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="text-sm text-gray-900">{activity}</p>
      </div>
    </div>
  )
}

// Quick Stat Component
function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

