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
  MapPin,
  Upload,
  X,
  MonitorPlay,
  Eye,
} from 'lucide-react'
import { motion } from 'motion/react'
import Hls from 'hls.js'
import { uploadVideoForStreaming, startHlsStream, stopHlsStream } from '../lib/api'

interface RealtimeEvent {
  id: number
  timestamp: string
  event_type: string
  severity: string
  title: string
  description: string
  location: string
  metadata: any
}

export default function Monitoring() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState('camera-1')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isStreamActive, setIsStreamActive] = useState(false)
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([])
  const [latestActivity, setLatestActivity] = useState({
    activity: '대기 중',
    risk: '알 수 없음',
    location: '알 수 없음'
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  // 시간 포맷 함수
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const eventTime = new Date(timestamp)
    const diffMs = now.getTime() - eventTime.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)

    if (diffSec < 60) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    return eventTime.toLocaleDateString('ko-KR')
  }

  // 컴포넌트 마운트 시 스트림 상태 확인 및 자동 연결
  useEffect(() => {
    const checkAndConnectStream = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/live-monitoring/stream-status/${selectedCamera}`
        )
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.is_active && data.is_running) {
            console.log('서버에서 스트림 실행 중 감지, 자동 연결 시작...')
            
            // HLS 플레이어 연결
            const fullPlaylistUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${data.playlist_url}`
            
            if (Hls.isSupported() && videoRef.current) {
              if (hlsRef.current) {
                hlsRef.current.destroy()
              }

              const hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true,
                startPosition: -1,  // 라이브 엣지에서 시작
                liveSyncDuration: 3,
                liveMaxLatencyDuration: 15,  // VLM 분석 중에도 끊기지 않도록
                maxBufferLength: 20,
                maxMaxBufferLength: 40,
                backBufferLength: 0,
                manifestLoadingTimeOut: 60000,  // 60초로 증가
                manifestLoadingMaxRetry: 10,    // 재시도 횟수 증가
                levelLoadingTimeOut: 60000,     // 60초로 증가
                levelLoadingMaxRetry: 10,       // 재시도 횟수 증가
                fragLoadingTimeOut: 60000,      // 세그먼트 로딩 타임아웃 추가
                fragLoadingMaxRetry: 10,        // 세그먼트 로딩 재시도 추가
              })

              hls.loadSource(fullPlaylistUrl)
              hls.attachMedia(videoRef.current)

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS 매니페스트 파싱 완료, 라이브 엣지로 이동')
                if (videoRef.current) {
                  // 라이브 스트림의 경우 끝에서 시작 (3초 버퍼)
                  const duration = videoRef.current.duration
                  if (duration && isFinite(duration) && duration > 3) {
                    videoRef.current.currentTime = duration - 3
                    console.log(`라이브 엣지 설정: ${duration - 3}초`)
                  }
                  videoRef.current.play().catch(e => console.warn('자동 재생 실패:', e))
                }
              })

              hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                  console.error('HLS 치명적 오류:', data)
                }
              })

              hlsRef.current = hls
              setIsStreamActive(true)
              setIsPlaying(true)
              
              console.log('✅ 스트림 자동 연결 완료')
            } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
              // Safari 네이티브 HLS 지원
              videoRef.current.src = fullPlaylistUrl
              videoRef.current.play().catch(e => console.warn('자동 재생 실패:', e))
              setIsStreamActive(true)
              setIsPlaying(true)
              
              console.log('✅ 스트림 자동 연결 완료 (네이티브 HLS)')
            }
          } else {
            console.log('서버에 실행 중인 스트림 없음')
          }
        }
      } catch (error) {
        console.error('스트림 상태 확인 실패:', error)
      }
    }

    checkAndConnectStream()

    // 컴포넌트 언마운트 시 HLS 정리
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [selectedCamera])

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

  // 실시간 이벤트 폴링
  useEffect(() => {
    if (!isStreamActive) return

    const fetchRealtimeEvents = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/live-monitoring/events/${selectedCamera}/latest?limit=50`
        )
        if (response.ok) {
          const data = await response.json()
          setRealtimeEvents(data.events || [])
          
          // 최신 이벤트에서 활동 정보 업데이트
          if (data.events && data.events.length > 0) {
            const latest = data.events[0]
            const metadata = latest.metadata || {}
            const currentActivity = metadata.current_activity || {}
            const safetyStatus = metadata.safety_status || {}
            
            setLatestActivity({
              activity: currentActivity.activity_type || currentActivity.description || '활동 중',
              risk: safetyStatus.risk_level === 'safe' ? '낮음' : 
                    safetyStatus.risk_level === 'warning' ? '중간' : 
                    safetyStatus.risk_level === 'danger' ? '높음' : '알 수 없음',
              location: currentActivity.location || latest.location || '알 수 없음'
            })
          }
        }
      } catch (error) {
        console.error('실시간 이벤트 조회 실패:', error)
      }
    }

    // 초기 로드
    fetchRealtimeEvents()

    // 10초마다 폴링
    const interval = setInterval(fetchRealtimeEvents, 10000)

    return () => clearInterval(interval)
  }, [isStreamActive, selectedCamera])

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

  // 비디오 업로드 및 HLS 스트리밍 시작
  const handleUploadAndStream = async () => {
    if (!videoFile) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // 1. 기존 스트림 중지
      if (isStreamActive) {
        await handleStopStream()
      }

      // 2. 비디오 업로드
      console.log('비디오 업로드 시작...')
      await uploadVideoForStreaming(selectedCamera, videoFile)

      // 3. HLS 스트림 시작 요청
      console.log('HLS 스트림 시작 요청...')
      const response = await startHlsStream(selectedCamera)
      console.log('HLS 스트림 시작 응답:', response)

      // 4. HLS 재생 시작
      const playlistUrl = response.playlist_url
      // API URL이 상대 경로인 경우 절대 경로로 변환 (필요 시)
      const fullPlaylistUrl = playlistUrl.startsWith('http')
        ? playlistUrl
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${playlistUrl}`

      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy()
        }

        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          startPosition: -1,
          liveSyncDuration: 3,
          liveMaxLatencyDuration: 15,
          maxBufferLength: 20,
          maxMaxBufferLength: 40,
          backBufferLength: 0,
          manifestLoadingTimeOut: 60000,
          manifestLoadingMaxRetry: 10,
          levelLoadingTimeOut: 60000,
          levelLoadingMaxRetry: 10,
          fragLoadingTimeOut: 60000,
          fragLoadingMaxRetry: 10,
        })

        hls.loadSource(fullPlaylistUrl)

        if (videoRef.current) {
          hls.attachMedia(videoRef.current)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS 매니페스트 로드됨, 라이브 엣지로 이동')
            if (videoRef.current) {
              const duration = videoRef.current.duration
              if (duration && isFinite(duration) && duration > 3) {
                videoRef.current.currentTime = duration - 3
              }
            }
            videoRef.current?.play().catch(e => console.error('재생 오류:', e))
            setIsStreamActive(true)
            setIsPlaying(true)
          })

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('네트워크 오류, 복구 시도...')
                  hls.startLoad()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('미디어 오류, 복구 시도...')
                  hls.recoverMediaError()
                  break
                default:
                  console.error('치명적 오류, 재생 불가:', data)
                  hls.destroy()
                  break
              }
            }
          })
        }

        hlsRef.current = hls
      } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 등 네이티브 HLS 지원
        videoRef.current.src = fullPlaylistUrl
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current?.play()
          setIsStreamActive(true)
          setIsPlaying(true)
        })
      } else {
        setUploadError('이 브라우저는 HLS 재생을 지원하지 않습니다.')
      }

      setShowUploadModal(false)
    } catch (error: any) {
      console.error('스트리밍 시작 실패:', error)
      setUploadError(error.message || '스트리밍을 시작할 수 없습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // HLS 스트림 시작 (비디오 업로드 없이 기존 영상 사용)
  const handleStartHlsStream = async () => {
    setIsUploading(true)
    setUploadError(null)

    try {
      // 1. 기존 스트림 중지
      if (isStreamActive) {
        await handleStopStream()
      }

      // 2. HLS 스트림 시작 요청
      console.log('HLS 스트림 시작 요청...')
      const response = await startHlsStream(selectedCamera)
      console.log('HLS 스트림 시작 응답:', response)

      // 3. HLS 재생 시작 (플레이리스트 생성 대기)
      const playlistUrl = response.playlist_url
      const fullPlaylistUrl = playlistUrl.startsWith('http')
        ? playlistUrl
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${playlistUrl}`

      // 플레이리스트가 생성될 때까지 최대 20초 대기
      console.log('HLS 플레이리스트 생성 대기 중...')
      let playlistReady = false
      for (let i = 0; i < 20; i++) {
        try {
          const checkResponse = await fetch(fullPlaylistUrl, { method: 'GET' })
          if (checkResponse.ok) {
            playlistReady = true
            console.log(`HLS 플레이리스트 준비 완료 (${i + 1}초 후)`)
            break
          }
        } catch (e) {
          // 계속 시도
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (!playlistReady) {
        console.warn('플레이리스트가 준비되지 않았지만 재생을 시도합니다...')
      }

      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy()
        }

        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          startPosition: -1,
          liveSyncDuration: 3,
          liveMaxLatencyDuration: 15,
          maxBufferLength: 20,
          maxMaxBufferLength: 40,
          backBufferLength: 0,
          manifestLoadingTimeOut: 60000,
          manifestLoadingMaxRetry: 10,
          levelLoadingTimeOut: 60000,
          levelLoadingMaxRetry: 10,
          fragLoadingTimeOut: 60000,
          fragLoadingMaxRetry: 10,
        })

        hls.loadSource(fullPlaylistUrl)

        if (videoRef.current) {
          hls.attachMedia(videoRef.current)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS 매니페스트 로드됨, 라이브 엣지로 이동')
            if (videoRef.current) {
              const duration = videoRef.current.duration
              if (duration && isFinite(duration) && duration > 3) {
                videoRef.current.currentTime = duration - 3
              }
            }
            videoRef.current?.play().catch(e => console.error('재생 오류:', e))
            setIsStreamActive(true)
            setIsPlaying(true)
          })

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('네트워크 오류, 복구 시도...')
                  hls.startLoad()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('미디어 오류, 복구 시도...')
                  hls.recoverMediaError()
                  break
                default:
                  console.error('치명적 오류, 재생 불가:', data)
                  hls.destroy()
                  setUploadError('스트림 재생 중 오류가 발생했습니다.')
                  break
              }
            }
          })
        }

        hlsRef.current = hls
      } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 등 네이티브 HLS 지원
        videoRef.current.src = fullPlaylistUrl
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current?.play()
          setIsStreamActive(true)
          setIsPlaying(true)
        })
      } else {
        setUploadError('이 브라우저는 HLS 재생을 지원하지 않습니다.')
      }
    } catch (error: any) {
      console.error('HLS 스트림 시작 실패:', error)
      setUploadError(error.message || 'HLS 스트림을 시작할 수 없습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // 스트림 중지
  const handleStopStream = async () => {
    try {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
        videoRef.current.load()
      }

      await stopHlsStream(selectedCamera)
      setIsStreamActive(false)
      setIsPlaying(false)
    } catch (error) {
      console.error('스트림 중지 오류:', error)
    }
  }

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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Feed */}
        <div className="lg:col-span-2 space-y-4">
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
                muted={isMuted}
              />

              {/* Placeholder when no stream */}
              {!isStreamActive && (
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
                      'HLS 스트림 시작' 버튼을 클릭하여 라이브 스트리밍을 시작하세요
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
                    {!isStreamActive ? (
                      <>
                        <button
                          onClick={handleStartHlsStream}
                          disabled={isUploading}
                          className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MonitorPlay className="w-4 h-4" />
                          {isUploading ? '시작 중...' : 'HLS 스트림 시작'}
                        </button>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors backdrop-blur-sm"
                        >
                          <Upload className="w-4 h-4" />
                          비디오 업로드
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStopStream}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                      >
                        <X className="w-4 h-4" />
                        스트림 중지
                      </button>
                    )}
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

          {/* AI Analysis Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
              <h3 className="text-lg font-semibold text-gray-900">AI 분석</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <AnalysisStat
                label="현재 활동"
                value={latestActivity.activity}
                icon={Activity}
                color="safe"
              />
              <AnalysisStat
                label="위험도"
                value={latestActivity.risk}
                icon={AlertTriangle}
                color={latestActivity.risk === '낮음' ? 'safe' : 'warning'}
              />
              <AnalysisStat
                label="위치"
                value={latestActivity.location}
                icon={MapPin}
                color="primary"
              />
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar - Activity Log & Alerts */}
        <div className="space-y-4">
          {/* Real-time Alerts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-warning-400 to-warning-600 rounded-full" />
              <h3 className="text-lg font-semibold text-gray-900">알림</h3>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {realtimeEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">실시간 이벤트가 없습니다</p>
                  <p className="text-xs mt-1">스트림을 시작하면 AI가 분석을 시작합니다</p>
                </div>
              ) : (
                realtimeEvents.map((event) => (
                  <AlertItem
                    key={event.id}
                    type={event.severity === 'danger' || event.severity === 'warning' ? 'warning' : 'info'}
                    message={event.title}
                    time={formatTimeAgo(event.timestamp)}
                  />
                ))
              )}
            </div>
          </motion.div>

          {/* Activity Timeline */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
              <h3 className="text-lg font-semibold text-gray-900">활동 타임라인</h3>
            </div>
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
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="card bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white border-0 shadow-xl overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5" />
                <h3 className="text-lg font-semibold">오늘의 통계</h3>
              </div>
              <div className="space-y-3">
                <QuickStat label="모니터링 시간" value="8시간 45분" />
                <QuickStat label="감지된 위험" value="3건" />
                <QuickStat label="세이프존 체류" value="92%" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">비디오 업로드</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setVideoFile(null)
                  setUploadError(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </motion.div>
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
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <div className="w-0.5 flex-1 bg-gray-200 my-1" />
      </div>
      <div className="pb-4">
        <p className="text-xs text-gray-500">{time}</p>
        <p className="text-sm text-gray-900">{activity}</p>
      </div>
    </div>
  )
}

// Quick Stat Component
function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/80">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}
