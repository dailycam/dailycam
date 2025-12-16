import { useState, useRef, useEffect } from 'react'
import {
  Camera,
  AlertTriangle,
  Activity,
  Clock,
  MapPin,
  Upload,
  X,
  MonitorPlay,
  TrendingUp,
  Shield,
} from 'lucide-react'
import { stopStream } from '../lib/api'
import { API_BASE_URL } from '@/constants/api'
import { useOutletContext } from 'react-router-dom'

// Clip Type Definition
interface Clip {
  id: number
  title: string
  description: string
  video_url: string
  thumbnail_url: string
  category: string
  created_at: string
  importance: 'high' | 'medium' | 'low'
}

export default function LiveMonitoring() {
  // AppLayout에서 전달된 컨텍스트 사용 (플레이어는 AppLayout에서 관리)
  const outletContext = useOutletContext<{
    hlsUrl: string | null
    setHlsUrl: (url: string | null) => void
    selectedCamera: string
    setSelectedCamera: (camera: string) => void
  }>()

  const [selectedCamera, setSelectedCamera] = useState(outletContext?.selectedCamera || 'camera-1')
  const [hlsUrl, setHlsUrl] = useState<string | null>(outletContext?.hlsUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isStreamActive, setIsStreamActive] = useState(false)
  const [hlsError, setHlsError] = useState<string | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AppLayout의 상태와 동기화
  useEffect(() => {
    if (outletContext) {
      setHlsUrl(outletContext.hlsUrl)
      setSelectedCamera(outletContext.selectedCamera)
    }
  }, [outletContext])

  // 카메라 변경 시 AppLayout에 알림
  useEffect(() => {
    if (outletContext?.setSelectedCamera) {
      outletContext.setSelectedCamera(selectedCamera)
    }
  }, [selectedCamera, outletContext])

  // 최근 클립 폴링
  useEffect(() => {
    const fetchClips = async () => {
      try {
        // 로컬 시간 기준 오늘 날짜 구하기 (YYYY-MM-DD)
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const today = `${year}-${month}-${day}`

        const response = await fetch(`${API_BASE_URL}/api/clips/list?limit=10&target_date=${today}`)
        if (response.ok) {
          const data = await response.json()
          setClips(data.clips)
        }
      } catch (error) {
        console.error('클립 목록 조회 실패:', error)
      }
    }

    fetchClips()
    const interval = setInterval(fetchClips, 5000) // 5초마다 갱신

    return () => clearInterval(interval)
  }, [])

  // 플레이어는 AppLayout에서 관리됨 (DOM 조작 제거)

  // 페이지 로드 시 스트림 상태 확인 (AppLayout에서도 확인하므로 여기서는 초기 로드만)
  useEffect(() => {
    const checkStreamStatus = async () => {
      try {
        const status = await fetch(
          `${API_BASE_URL}/api/live-monitoring/stream-status/${selectedCamera}`,
          { credentials: 'include' }
        )
        const data = await status.json()

        if (data.is_active && data.is_running) {
          const url = `${API_BASE_URL}/api/live-monitoring/hls/${selectedCamera}/${selectedCamera}.m3u8`
          setHlsUrl(url)
          if (outletContext?.setHlsUrl) {
            outletContext.setHlsUrl(url)
          }
          setIsStreamActive(true)
        } else {
          setHlsUrl(null)
          if (outletContext?.setHlsUrl) {
            outletContext.setHlsUrl(null)
          }
          setIsStreamActive(false)
        }
      } catch (error) {
        console.error('[HLS] 스트림 상태 확인 실패:', error)
      }
    }

    // 초기 로드 시 한 번만 확인 (AppLayout에서 주기적으로 확인함)
    checkStreamStatus()
  }, [selectedCamera, outletContext])

  // 비디오 파일 선택
  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        setUploadError('비디오 파일만 업로드 가능합니다.')
        return
      }
      setVideoFile(file)
      setUploadError(null)
    }
  }

  // 비디오 업로드 및 스트리밍 시작
  const handleUploadAndStream = async () => {
    if (!videoFile) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Settings API를 통해 업로드 (카메라 설정 API 사용)
      const formData = new FormData()
      formData.append('video', videoFile)

      const response = await fetch(`${API_BASE_URL}/api/camera-settings/cameras/${selectedCamera}/upload-video`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('업로드 실패')
      }

      // 잠시 대기 후 스트림 상태 확인
      await new Promise(resolve => setTimeout(resolve, 2000))

      const status = await fetch(
        `${API_BASE_URL}/api/live-monitoring/stream-status/${selectedCamera}`,
        { credentials: 'include' }  // httpOnly Cookie 전송
      )
      const data = await status.json()

      if (data.is_active && data.is_running) {
        const url = `${API_BASE_URL}/api/live-monitoring/hls/${selectedCamera}/${selectedCamera}.m3u8`
        setHlsUrl(url)
        if (outletContext?.setHlsUrl) {
          outletContext.setHlsUrl(url)
        }
        setIsStreamActive(true)
        setShowUploadModal(false)
      } else {
        setUploadError('스트림 시작 실패. 다시 시도해주세요.')
      }
    } catch (error: any) {
      console.error('[HLS] 업로드 실패:', error)
      setUploadError(error.message || '업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // 스트림 중지
  const handleStopStream = async () => {
    try {
      await stopStream(selectedCamera)
      setHlsUrl(null)
      if (outletContext?.setHlsUrl) {
        outletContext.setHlsUrl(null)
      }
      setIsStreamActive(false)
      setHlsError(null)
    } catch (error: any) {
      console.error('[HLS] 스트림 중지 오류:', error)
    }
  }

  // 시간 포맷팅 함수
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch (e) {
      return ''
    }
  }

  // 중요도에 따른 타입 반환
  const getClipType = (importance: string): 'warning' | 'info' | 'safe' => {
    switch (importance) {
      case 'high': return 'warning'
      case 'medium': return 'info'
      default: return 'safe'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">모니터링</h1>
          <p className="text-gray-600 mt-1">아이의 행동을 분석합니다</p>
        </div>
        <div className="flex gap-2">
          {!hlsUrl ? (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              비디오 업로드
            </button>
          ) : (
            <button
              onClick={handleStopStream}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              스트림 중지
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Camera Feed - 플레이어는 AppLayout 상단에 표시됨 */}
          <div className="card p-0 overflow-hidden">
            <div
              className="relative bg-gray-900 aspect-video"
              style={{
                pointerEvents: 'none',
                overflow: 'hidden'
              }}
            >
              {/* 플레이어는 AppLayout 상단에 표시되므로 여기서는 안내 메시지만 */}
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-0">
                {!hlsUrl ? (
                  <div className="text-center text-gray-400">
                    <Camera className="w-20 h-20 mx-auto mb-4 opacity-50" />
                    <p className="text-base">카메라 피드</p>
                    <p className="text-sm mt-2">
                      {selectedCamera === 'camera-1'
                        ? '거실 카메라'
                        : selectedCamera === 'camera-2'
                          ? '아이방 카메라'
                          : '주방 카메라'}
                    </p>
                    <p className="text-xs mt-2 text-gray-500">
                      비디오 파일을 업로드하여 스트리밍을 시작하세요
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <p className="text-base">라이브 스트림 재생 중</p>
                    <p className="text-xs mt-2 text-gray-500">
                      비디오 플레이어는 상단에 표시됩니다
                    </p>
                  </div>
                )}
              </div>

              {/* Live Indicator */}
              {hlsUrl && isStreamActive && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-danger/90 text-white px-3 py-1.5 rounded-full z-10">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">LIVE</span>
                </div>
              )}

              {/* HLS Error Display */}
              {hlsError && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg z-10">
                  <p className="text-sm">{hlsError}</p>
                </div>
              )}

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
            <h3 className="text-base font-semibold text-gray-900 mb-4">AI 분석</h3>
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
          {/* Real-time Clips Log */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MonitorPlay className="w-5 h-5 text-primary-600" />
              AI 감지 로그
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {clips.length > 0 ? (
                clips.map((clip) => (
                  <AlertItem
                    key={clip.id}
                    type={getClipType(clip.importance)}
                    message={clip.title}
                    time={formatTime(clip.created_at)}
                    category={clip.category}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <p>감지된 클립이 없습니다.</p>
                </div>
              )}
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">비디오 업로드</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setVideoFile(null)
                  setUploadError(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카메라: {selectedCamera}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-700">
                    {videoFile ? videoFile.name : '비디오 파일 선택'}
                  </p>
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  💡 비디오 업로드 후 자동으로 HLS 스트리밍이 시작됩니다.
                </p>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{uploadError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleUploadAndStream}
                  disabled={!videoFile || isUploading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isUploading ? '업로드 중...' : '업로드 및 스트리밍 시작'}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setVideoFile(null)
                    setUploadError(null)
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Camera Thumbnail Component
function CameraThumbnail({
  id: _id,
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
      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${isActive
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
  category,
}: {
  type: 'warning' | 'info' | 'safe'
  message: string
  time: string
  category?: string
}) {
  const typeConfig = {
    warning: { bg: 'bg-warning-50', icon: 'text-warning', border: 'border-warning-200' },
    info: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    safe: { bg: 'bg-safe-50', icon: 'text-safe', border: 'border-safe-200' },
  }

  const config = typeConfig[type]
  
  // 클립 하이라이트 페이지와 동일한 Lucide 아이콘 사용
  // 발달: TrendingUp (text-safe), 안전: Shield (text-warning)
  const IconComponent = category === '발달' ? TrendingUp : Shield
  const iconColor = category === '발달' ? 'text-safe' : 'text-warning'

  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-2">
        <IconComponent className={`w-4 h-4 mt-0.5 ${iconColor}`} />
        <div className="flex-1">
          <p className="text-sm text-gray-900">{message}</p>
          <p className="text-xs text-gray-500 mt-1">{time}</p>
        </div>
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

