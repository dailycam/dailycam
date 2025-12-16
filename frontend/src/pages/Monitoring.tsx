import { useState, useRef, useEffect } from 'react'
import {
  Camera,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  AlertTriangle,
  Activity,
  MonitorPlay,
  TrendingUp,
  Shield,
} from 'lucide-react'
import { motion } from 'motion/react'
import Hls from 'hls.js'
import { API_BASE_URL } from '@/constants/api'
import { getDashboardData } from '@/lib/api'

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




export default function Monitoring() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true) // 자동 재생을 위해 기본값을 mute로 설정
  const [selectedCamera, setSelectedCamera] = useState('camera-1')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isStreamActive, setIsStreamActive] = useState(false)
  const [monitoringStats, setMonitoringStats] = useState({
    today_total_events: 0,
    danger_events: 0,
    today_monitoring_minutes: 0
  })
  const [clips, setClips] = useState<Clip[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  // 시간 포맷 (분 -> 시간 분)
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}분`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`
  }

  // 시간 포맷팅 함수 (ISO -> string)
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

  // 영상 삭제 이벤트 감지
  useEffect(() => {
    const handleVideoDeleted = async () => {
      console.log('영상 삭제 감지, 스트림 상태 확인 중...')

      // 스트림 상태 확인
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/live-monitoring/stream-status/${selectedCamera}`
        )

        if (response.ok) {
          const data = await response.json()

          // 스트림이 중지되었으면 UI 업데이트
          if (!data.is_active || !data.is_running) {
            console.log('스트림이 중지되었습니다. UI 업데이트 중...')
            if (hlsRef.current) {
              hlsRef.current.destroy()
              hlsRef.current = null
            }
            if (videoRef.current) {
              videoRef.current.pause()
              videoRef.current.src = ''
              videoRef.current.load()
            }
            setIsStreamActive(false)
            setIsPlaying(false)
            setUploadError('영상이 삭제되어 스트림이 중지되었습니다. 자동으로 재시작을 시도합니다.')
          }
        }
      } catch (error) {
        console.error('스트림 상태 확인 오류:', error)
      }
    }

    window.addEventListener('video-deleted', handleVideoDeleted as EventListener)
    return () => {
      window.removeEventListener('video-deleted', handleVideoDeleted as EventListener)
    }
  }, [selectedCamera])

  // 컴포넌트 마운트 시 스트림 상태 확인 및 자동 연결
  useEffect(() => {
    const checkAndConnectStream = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/live-monitoring/stream-status/${selectedCamera}`
        )

        if (response.ok) {
          const data = await response.json()

          if (data.is_active && data.is_running) {
            console.log('서버에서 스트림 실행 중 감지, 자동 연결 시작...')

            // HLS 플레이어 연결
            const fullPlaylistUrl = `${API_BASE_URL}${data.playlist_url}`

            if (Hls.isSupported() && videoRef.current) {
              // 기존 플레이어가 있으면 파괴하고 새로 생성
              if (hlsRef.current) {
                hlsRef.current.destroy()
              }

              const hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true,
                startPosition: -1,  // 라이브 엣지에서 시작
                liveSyncDuration: 3,
                liveMaxLatencyDuration: 15,
                maxBufferLength: 30,        // 20 → 30 (더 많은 버퍼)
                maxMaxBufferLength: 60,     // 40 → 60
                backBufferLength: 10,       // 0 → 10 (이전 세그먼트 유지)
                manifestLoadingTimeOut: 10000,   // 60초 → 10초 (더 빠른 응답)
                manifestLoadingMaxRetry: 10,
                levelLoadingTimeOut: 10000,      // 60초 → 10초
                levelLoadingMaxRetry: 10,
                fragLoadingTimeOut: 10000,       // 60초 → 10초
                fragLoadingMaxRetry: 10,
              })

              hls.loadSource(fullPlaylistUrl)
              hls.attachMedia(videoRef.current)

              // 즉시 표시 (매니페스트 파싱 전에도)
              setIsStreamActive(true)

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS 매니페스트 파싱 완료, 라이브 엣지로 이동')
                if (videoRef.current) {
                  const duration = videoRef.current.duration
                  if (duration && isFinite(duration) && duration > 3) {
                    videoRef.current.currentTime = Math.max(0, duration - 3)
                  }
                  // play()는 isPlaying useEffect에서 처리하도록 상태만 변경
                  setIsPlaying(true)
                }
              })

              hls.on(Hls.Events.LEVEL_LOADED, () => {
                // 로그 제거 (너무 자주 발생)
                setIsStreamActive(true)
              })

              hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                  console.error('HLS 치명적 오류:', data)
                  // 자동 복구 시도
                  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    console.log('네트워크 오류, 재연결 시도...')
                    hls.startLoad()
                  } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    console.log('미디어 오류, 복구 시도...')
                    hls.recoverMediaError()
                  }
                }
              })

              hlsRef.current = hls
              setIsPlaying(true)
            } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
              videoRef.current.src = fullPlaylistUrl
              videoRef.current.addEventListener('loadedmetadata', () => {
                if (videoRef.current) {
                  const duration = videoRef.current.duration
                  if (duration && isFinite(duration) && duration > 3) {
                    videoRef.current.currentTime = Math.max(0, duration - 3)
                  }
                }
                setIsStreamActive(true)
              }, { once: true })
              videoRef.current.play().catch(e => console.warn('자동 재생 실패:', e))
              setIsPlaying(true)
            }
          } else {
            // 스트림이 없으면 백엔드가 자동으로 시작할 때까지 대기
            // 프론트엔드에서 스트림을 시작하지 않음 (백엔드가 계속 돌고 있어야 함)
            console.log('스트림이 없음. 백엔드가 자동으로 시작할 때까지 대기 중...')
          }
        }
      } catch (error) {
        console.error('스트림 상태 확인 실패:', error)
      }
    }

    checkAndConnectStream()

    return () => {
      // cleanup 시 플레이어와 비디오는 유지 (백그라운드에서 계속 재생)
      // 다른 페이지로 가도 영상은 계속 돌아가고, 돌아오면 즉시 보임
    }
  }, [selectedCamera]) // isStreamActive 의존성 제거 (무한 루프 방지)

  // 비디오 재생/일시정지 제어
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.warn('재생 실패:', e))
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying])

  // 음소거 제어
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  // 모니터링 통계 폴링 (대시보드 데이터 연동)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 로컬 시간 기준 오늘 날짜 구하기 (YYYY-MM-DD)
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const today = `${year}-${month}-${day}`

        // 대시보드 데이터 호출 (다른 페이지 정보 활용)
        const data = await getDashboardData(today, 1)

        // 위험 감지 건수 계산 (High + Medium)
        const dangerCount = data.risks.reduce((acc, risk) => {
          if (risk.level === 'high' || risk.level === 'medium') {
            return acc + risk.count
          }
          return acc
        }, 0)

        setMonitoringStats({
          today_total_events: data.incidentCount,
          danger_events: dangerCount,
          today_monitoring_minutes: Math.round(data.monitoringHours * 60)
        })

      } catch (error) {
        console.error('통계 조회 실패:', error)
        // 실패 시 기본값 0 유지
      }
    }

    // 초기 로드
    fetchStats()

    // 30초마다 갱신 (대시보드 데이터는 자주 안 변함)
    const interval = setInterval(fetchStats, 30000)

    return () => clearInterval(interval)
  }, [selectedCamera])

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
    // 5초마다 갱신
    const interval = setInterval(fetchClips, 5000)

    return () => clearInterval(interval)
  }, [])



  return (
    <div className="p-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <MonitorPlay className="w-8 h-8 text-primary-600" />
          <h1 className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent text-3xl font-bold">
            모니터링
          </h1>
        </div>
        <p className="text-gray-600">아이의 행동을 분석합니다</p>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Feed & Stats (Left Column) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            {/* Main Camera Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="card p-0 overflow-hidden border-0 shadow-xl"
            >
              <div className="relative bg-gray-900 aspect-video">
                {/* Video Player */}
                <video
                  ref={videoRef}
                  className={`w-full h-full object-contain ${!isStreamActive ? 'hidden' : ''}`}
                  playsInline
                  autoPlay
                  muted={isMuted}
                />

                {/* Placeholder when no stream */}
                {!isStreamActive && (!videoRef.current?.src || videoRef.current?.readyState < 2) && (
                  <div className="absolute inset-0 flex items-center justify-center">
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
                        스트림 연결 중...
                      </p>
                      {uploadError && (
                        <div className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm max-w-md mx-auto">
                          {uploadError}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Indicator */}
                {isStreamActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-danger-500 to-danger-600 text-white px-3 py-1.5 rounded-full shadow-lg z-10"
                  >
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold">LIVE</span>
                  </motion.div>
                )}

                {/* AI Detection Overlay */}
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg border border-white/20 z-10">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-safe" />
                    <span>AI 분석 중...</span>
                  </div>
                </div>

                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm">
                        <Maximize className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Camera Selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-3 gap-3"
            >
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
            </motion.div>

            {/* Monitoring Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
                <h3 className="text-lg font-semibold text-gray-900">오늘의 모니터링</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <AnalysisStat
                  label="총 모니터링 시간"
                  value={formatDuration(monitoringStats.today_monitoring_minutes)}
                  icon={Activity}
                  color="primary"
                />
                <AnalysisStat
                  label="위험 감지"
                  value={`${monitoringStats.danger_events}건`}
                  icon={AlertTriangle}
                  color={monitoringStats.danger_events > 0 ? "warning" : "safe"}
                />
                <AnalysisStat
                  label="감지된 이벤트"
                  value={`${monitoringStats.today_total_events}건`}
                  icon={MonitorPlay}
                  color="safe"
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Sidebar - Clip Logs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-4"
        >
          <div className="card h-full">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MonitorPlay className="w-5 h-5 text-primary-600" />
              AI 감지 로그
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
                <div className="text-center text-gray-500 py-10">
                  <Activity className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p>아직 감지된 클립이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

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
        ? 'border-primary-500 ring-2 ring-primary-200 shadow-lg'
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
