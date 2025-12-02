import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hls from 'hls.js'
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
  Upload,
  X,
  MonitorPlay,
  Eye,
  Info,
} from 'lucide-react'
import { motion } from 'motion/react'
import { 
  uploadVideoForStreaming, 
  getStreamUrl, 
  stopStream, 
  startStream,
  startHLSStream,
  stopHLSStream,
  getHLSPlaylistUrl,
  getStreamStatus,
  getLatestEvents,
  getMonitoringStats,
  resetMonitoringData,
  RealtimeEvent,
  MonitoringStats
} from '../lib/api'

export default function Monitoring() {
  const location = useLocation()
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState('camera-1')
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [streamSpeed, setStreamSpeed] = useState(1.0)
  const [streamLoop, setStreamLoop] = useState(true)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [isStreamActive, setIsStreamActive] = useState(false)
  const [isStartingStream, setIsStartingStream] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([])
  const [monitoringStats, setMonitoringStats] = useState<MonitoringStats | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isResettingData, setIsResettingData] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  
  // HLS 관련 상태
  const [useHLS] = useState(true)  // HLS 사용 여부 (FFmpeg 설치 완료)
  const [hlsPlaylistUrl, setHlsPlaylistUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamImgRef = useRef<HTMLImageElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const streamCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastVideoPathRef = useRef<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 실시간 데이터 로드
  const loadRealtimeData = async () => {
    try {
      setIsLoadingData(true)
      
      // 최신 이벤트 조회
      const eventsData = await getLatestEvents(selectedCamera, 20)
      setRealtimeEvents(eventsData.events)
      
      // 통계 조회
      const statsData = await getMonitoringStats(selectedCamera)
      setMonitoringStats(statsData)
      
      console.log('실시간 데이터 로드 완료:', { events: eventsData.count, stats: statsData })
    } catch (error) {
      // 백엔드 서버가 없거나 연결 실패 시 조용히 실패 (에러 로그만 출력)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
      } else {
        console.error('실시간 데이터 로드 실패:', error)
      }
      // 에러 발생 시에도 기존 데이터는 유지
    } finally {
      setIsLoadingData(false)
    }
  }

  // 스트림 복원 함수 (기존 URL 유지하여 스트림 연속성 보장)
  const restoreStreamFromBackend = async () => {
    try {
      // 이미 스트림이 활성화되어 있고 URL이 있으면 복원하지 않음
      if (isStreamActive && streamUrl) {
        console.log('이미 스트림이 활성화되어 있음, 복원 스킵')
        return
      }
      
      const status = await getStreamStatus(selectedCamera)
      console.log('백엔드 스트림 상태:', status.is_running)
      
      if (status.is_running) {
        // 백엔드에서 스트림이 활성화되어 있으면 복원
        const savedStreamInfo = localStorage.getItem(`stream_${selectedCamera}`)
        let url: string
        let streamLoopValue = streamLoop
        let streamSpeedValue = streamSpeed
        
        if (savedStreamInfo) {
          try {
            const info = JSON.parse(savedStreamInfo)
            streamLoopValue = info.streamLoop ?? streamLoop
            streamSpeedValue = info.streamSpeed ?? streamSpeed
            
            // 기존 URL이 있으면 그대로 사용 (타임스탬프 추가하지 않음 - 스트림 연속성 유지)
            if (info.streamUrl) {
              url = info.streamUrl
              console.log('기존 스트림 URL 사용 (연속성 유지):', url)
            } else {
              // URL이 없으면 새로 생성 (첫 시작 시에만)
              const timestamp = Date.now()
              if (info.isFakeStream) {
                url = getStreamUrl(
                  selectedCamera,
                  streamLoopValue,
                  streamSpeedValue,
                  timestamp
                )
                lastVideoPathRef.current = null
              } else if (info.videoPath) {
                lastVideoPathRef.current = info.videoPath
                url = getStreamUrl(
                  selectedCamera,
                  streamLoopValue,
                  streamSpeedValue,
                  timestamp,
                  info.videoPath
                )
              } else {
                url = getStreamUrl(
                  selectedCamera,
                  streamLoopValue,
                  streamSpeedValue,
                  timestamp
                )
                lastVideoPathRef.current = null
              }
            }
            
            // videoPath 복원
            if (info.videoPath) {
              lastVideoPathRef.current = info.videoPath
            } else if (info.isFakeStream) {
              lastVideoPathRef.current = null
            }
          } catch (e) {
            console.error('스트림 정보 파싱 실패, 기본값으로 복원:', e)
            // 파싱 실패 시 기본값으로 하이브리드 스트림 복원
            const timestamp = Date.now()
            url = getStreamUrl(selectedCamera, streamLoop, streamSpeed, timestamp)
            lastVideoPathRef.current = null
          }
        } else {
          // localStorage에 정보가 없어도 백엔드에서 활성화되어 있으면 기본값으로 복원
          console.log('localStorage에 정보 없음 - 기본값으로 하이브리드 스트림 복원')
          const timestamp = Date.now()
          url = getStreamUrl(selectedCamera, streamLoop, streamSpeed, timestamp)
          lastVideoPathRef.current = null
          
          // localStorage에 저장 (다음번을 위해)
          const streamInfo = {
            streamUrl: url,
            streamLoop: streamLoop,
            streamSpeed: streamSpeed,
            cameraId: selectedCamera,
            isStreamActive: true,
            isFakeStream: true,
          }
          localStorage.setItem(`stream_${selectedCamera}`, JSON.stringify(streamInfo))
          console.log('✅ localStorage에 스트림 정보 저장:', streamInfo)
        }
        
        // 스트림 URL 설정 (이미 URL이 같으면 설정하지 않음)
        if (streamUrl !== url) {
          setStreamLoop(streamLoopValue)
          setStreamSpeed(streamSpeedValue)
          // URL을 null로 설정하지 않고 바로 설정 (이미지 리로드 방지)
          setStreamUrl(url)
          setIsStreamActive(true)
          console.log('✅ 스트림 복원 완료 (URL 유지):', url)
        } else {
          // URL이 같으면 상태만 업데이트
          setIsStreamActive(true)
          console.log('✅ 스트림 이미 복원됨:', url)
        }
      } else {
        // 백엔드에서 스트림이 비활성화되어 있으면 프론트엔드 상태 초기화
        console.log('❌ 백엔드 스트림 비활성화 - 프론트엔드 상태 초기화')
        localStorage.removeItem(`stream_${selectedCamera}`)
        setIsStreamActive(false)
        setStreamUrl(null)
        lastVideoPathRef.current = null
        setReconnectAttempts(0)
      }
    } catch (error) {
      console.error('백엔드 스트림 상태 확인 실패:', error)
    }
  }

  // 페이지 로드 시 저장된 스트림 정보 복원 및 데이터 로드
  useEffect(() => {
    // 실시간 데이터 로드
    loadRealtimeData()
    
    // 백엔드 상태를 먼저 확인하여 스트림 복원
    restoreStreamFromBackend()
  }, [selectedCamera])

  // 페이지 가시성 변경 감지 (백그라운드에서도 스트림 유지)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && streamUrl && streamImgRef.current) {
        // 페이지가 다시 보일 때 스트림이 계속 로드되고 있는지 확인
        const img = streamImgRef.current
        // 이미지가 로드 중이 아니면 다시 로드 (하지만 URL은 변경하지 않음 - 이어서 재생)
        if (!img.complete || img.naturalWidth === 0) {
          console.log('페이지 복귀 - 스트림 이미지 재연결 (URL 유지)')
          // 이미지 소스를 그대로 유지하여 이어서 재생
          const currentSrc = img.src
          img.src = ''
          setTimeout(() => {
            img.src = currentSrc
          }, 10)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl])

  // React Router location 변경 감지 (다른 페이지에서 돌아올 때)
  useEffect(() => {
    // 모니터링 페이지로 돌아왔을 때만 실행
    if (location.pathname === '/monitoring') {
      console.log('🔄 모니터링 페이지 진입 - 스트림 상태 확인')
      
      // 이미 스트림이 활성화되어 있고 URL이 있으면 복원하지 않음 (이미지가 계속 로드되도록)
      if (isStreamActive && streamUrl) {
        console.log('스트림이 이미 활성화되어 있음, 복원 스킵')
        return
      }
      
      // 스트림이 없거나 비활성화되어 있으면 복원
      const timer = setTimeout(() => {
        restoreStreamFromBackend()
      }, 100)
      
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // 스트림 정보를 localStorage에 저장
  useEffect(() => {
    if (streamUrl && isStreamActive) {
      const streamInfo: any = {
        streamUrl: streamUrl,
        streamLoop: streamLoop,
        streamSpeed: streamSpeed,
        cameraId: selectedCamera,
        isStreamActive: isStreamActive, // 스트림 활성 상태도 저장
      }
      
      // videoPath가 있으면 저장 (업로드된 비디오인 경우)
      if (lastVideoPathRef.current) {
        streamInfo.videoPath = lastVideoPathRef.current
      } else {
        // videoPath가 없으면 하이브리드 스트림으로 표시
        streamInfo.isFakeStream = true
      }
      
      localStorage.setItem(`stream_${selectedCamera}`, JSON.stringify(streamInfo))
      console.log('스트림 정보 저장:', streamInfo)
    } else if (!isStreamActive && !streamUrl) {
      // 스트림이 완전히 중지된 경우에만 localStorage에서 제거
      localStorage.removeItem(`stream_${selectedCamera}`)
    }
  }, [streamUrl, streamLoop, streamSpeed, selectedCamera, isStreamActive])

  // 실시간 데이터 폴링 (스트림이 활성화되어 있을 때)
  useEffect(() => {
    if (isStreamActive) {
      // 5초마다 데이터 갱신
      pollingIntervalRef.current = setInterval(() => {
        loadRealtimeData()
      }, 5000)
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
        }
      }
    }
  }, [isStreamActive, selectedCamera])

  // 페이지 visibility 변경 감지 (브라우저 탭 전환 시)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/monitoring') {
        console.log('👁️ 페이지 가시성 변경 - 스트림 상태 확인')
        // 재연결 시도 횟수 리셋
        setReconnectAttempts(0)
        // 백엔드 상태 확인 후 복원
        restoreStreamFromBackend()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [location.pathname, selectedCamera])

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

    console.log('업로드 시작:', {
      camera: selectedCamera,
      file: videoFile.name,
      size: (videoFile.size / 1024 / 1024).toFixed(2) + ' MB',
    })

    try {
      if (streamUrl) {
        console.log('기존 스트림 중지 중...')
        try {
          await stopStream(selectedCamera)
        } catch (e) {
          console.warn('기존 스트림 중지 실패 (무시):', e)
        }
        setStreamUrl(null)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const result = await uploadVideoForStreaming(selectedCamera, videoFile)
      console.log('업로드 완료:', result)

      const timestamp = Date.now()
      lastVideoPathRef.current = result.video_path
      const url = getStreamUrl(
        selectedCamera,
        streamLoop,
        streamSpeed,
        timestamp,
        result.video_path
      )
      console.log('새 스트림 URL:', url)

      setStreamUrl(null)
      setReconnectAttempts(0)
      setIsStreamActive(true)
      
      setTimeout(() => {
        setStreamUrl(url)
        setIsPlaying(true)
        startStreamMonitoring()
      }, 100)

      setShowUploadModal(false)
    } catch (error: any) {
      console.error('업로드 실패:', error)
      const errorMessage =
        error.message ||
        '비디오 업로드 중 오류가 발생했습니다. 백엔드 서버를 확인해주세요.'
      setUploadError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  // 시간 포맷 헬퍼 함수
  const formatTimeAgo = (timestamp: string): string => {
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

  const formatTime = (timestamp: string): string => {
    const eventTime = new Date(timestamp)
    return eventTime.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // HLS 스트림 시작
  const handleStartHLSStream = async () => {
    setIsStartingStream(true)
    setStreamError(null)

    try {
      console.log('HLS 스트림 시작:', selectedCamera)
      const ageMonths = 12 // TODO: 사용자 설정에서 가져오기
      const result = await startHLSStream(selectedCamera, undefined, true, ageMonths)
      console.log('HLS 스트림 시작 성공:', result)
      
      // HLS 플레이리스트 URL 설정
      const playlistUrl = getHLSPlaylistUrl(selectedCamera)
      setHlsPlaylistUrl(playlistUrl)
      setIsStreamActive(true)
      setIsPlaying(true)
      
      console.log('✅ HLS 플레이리스트 URL 설정 완료:', playlistUrl)
    } catch (error: any) {
      console.error('HLS 스트림 시작 오류:', error)
      setStreamError(error.message || 'HLS 스트림 시작 중 오류가 발생했습니다.')
    } finally {
      setIsStartingStream(false)
    }
  }

  // 가짜 라이브 스트림 시작 (하이브리드) - MJPEG 방식
  const handleStartFakeStream = async () => {
    setIsStartingStream(true)
    setStreamError(null)

    try {
      console.log('하이브리드 스트림 시작:', selectedCamera)
      const ageMonths = 12
      const result = await startStream(selectedCamera, true, ageMonths)
      console.log('하이브리드 스트림 시작 성공:', result)
      
      const timestamp = Date.now()
      const url = getStreamUrl(selectedCamera, streamLoop, streamSpeed, timestamp)
      
      const streamInfo = {
        streamUrl: url,
        streamLoop: streamLoop,
        streamSpeed: streamSpeed,
        cameraId: selectedCamera,
        isStreamActive: true,
        isFakeStream: true,
      }
      localStorage.setItem(`stream_${selectedCamera}`, JSON.stringify(streamInfo))
      console.log('✅ 스트림 정보 저장 (하이브리드):', streamInfo)
      
      setStreamUrl(url)
      setIsStreamActive(true)
      setIsPlaying(true)
      startStreamMonitoring()
      console.log('✅ 스트림 URL 설정 완료:', url)
    } catch (error: any) {
      console.error('스트림 시작 오류:', error)
      setStreamError(error.message || '스트림 시작 중 오류가 발생했습니다.')
    } finally {
      setIsStartingStream(false)
    }
  }

  // 모니터링 데이터 초기화
  const handleResetMonitoringData = async () => {
    if (!window.confirm('현재 카메라의 모니터링 데이터를 모두 삭제할까요?')) {
      return
    }
    setIsResettingData(true)
    setResetMessage(null)
    try {
      const result = await resetMonitoringData(selectedCamera)
      setResetMessage(
        `삭제 완료 (실시간 이벤트 ${result.realtime_events_deleted}건, 1시간 분석 ${result.hourly_analyses_deleted}건)`
      )
      await loadRealtimeData()
    } catch (error: any) {
      console.error('모니터링 데이터 초기화 실패:', error)
      setResetMessage(error.message || '모니터링 데이터 초기화 중 오류가 발생했습니다.')
    } finally {
      setIsResettingData(false)
    }
  }

  // 스트림 중지
  const handleStopStream = async () => {
    try {
      stopStreamMonitoring()
      
      if (useHLS) {
        // HLS 스트림 중지
        await stopHLSStream(selectedCamera)
        setHlsPlaylistUrl(null)
        
        // HLS 인스턴스 정리
        if (hlsRef.current) {
          hlsRef.current.destroy()
          hlsRef.current = null
        }
      } else {
        // MJPEG 스트림 중지
        await stopStream(selectedCamera)
        setStreamUrl(null)
      }
      
      setIsPlaying(false)
      setIsStreamActive(false)
      setReconnectAttempts(0)
      lastVideoPathRef.current = null
      localStorage.removeItem(`stream_${selectedCamera}`)
    } catch (error: any) {
      console.error('스트림 중지 오류:', error)
    }
  }

  // 카메라 변경 시에만 스트림 URL 업데이트
  useEffect(() => {
    if (streamUrl && selectedCamera) {
      // 카메라가 변경된 경우에만 URL 재생성
      const currentUrl = new URL(streamUrl)
      const currentCamera = currentUrl.pathname.split('/').pop()
      
      if (currentCamera !== selectedCamera) {
        // 카메라가 변경된 경우에만 URL 재생성
        const url = getStreamUrl(selectedCamera, streamLoop, streamSpeed)
        setStreamUrl(url)
      }
      // loop/speed 변경 시에는 URL을 변경하지 않음 (이미지 리로드 방지)
      // 백엔드가 쿼리 파라미터를 읽어서 처리하지만, 이미 연결된 스트림은 계속 유지됨
    }
  }, [selectedCamera])

  // 스트림 이미지 로드 오류 처리
  const handleStreamError = () => {
    // 이미 재연결 중이면 무시
    if (reconnectTimeoutRef.current) {
      return
    }
    
    console.warn('스트림 이미지 로드 실패, 재연결 시도...')
    setIsStreamActive(false)
    
    if (reconnectAttempts < 3 && streamUrl) {
      const newAttempts = reconnectAttempts + 1
      setReconnectAttempts(newAttempts)
      
      console.log(`재연결 시도 ${newAttempts}/3`)
      
      reconnectTimeoutRef.current = setTimeout(() => {
        // URL을 변경하지 않고 이미지만 재로드
        if (streamImgRef.current && streamUrl) {
          const img = streamImgRef.current
          const currentSrc = img.src
          img.src = ''
          setTimeout(() => {
            img.src = currentSrc
            setIsStreamActive(true)
          }, 100)
        }
        reconnectTimeoutRef.current = null
      }, 2000)
    } else {
      console.error('스트림 재연결 실패 - 최대 시도 횟수 초과')
      setUploadError('스트림 연결에 실패했습니다. 페이지를 새로고침해주세요.')
      setIsStreamActive(false)
      reconnectTimeoutRef.current = null
    }
  }

  // 스트림 이미지 로드 성공 처리
  const handleStreamLoad = () => {
    setIsStreamActive(true)
    setReconnectAttempts(0)
    console.log('스트림 연결 성공')
  }

  // 스트림 모니터링 시작
  const startStreamMonitoring = () => {
    if (streamCheckIntervalRef.current) {
      clearInterval(streamCheckIntervalRef.current)
    }

    streamCheckIntervalRef.current = setInterval(() => {
      if (streamUrl && streamImgRef.current) {
        const img = streamImgRef.current
        if (!img.complete || img.naturalWidth === 0) {
          console.warn('스트림 이미지가 로드되지 않음, 재연결 시도...')
          handleStreamError()
        } else {
          setIsStreamActive(true)
        }
      }
    }, 30000)
  }

  // 스트림 모니터링 중지
  const stopStreamMonitoring = () => {
    if (streamCheckIntervalRef.current) {
      clearInterval(streamCheckIntervalRef.current)
      streamCheckIntervalRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }

  // HLS 플레이어 초기화 및 관리
  useEffect(() => {
    if (!useHLS || !hlsPlaylistUrl || !videoRef.current) {
      return
    }

    const video = videoRef.current

    // HLS 지원 확인
    if (Hls.isSupported()) {
      console.log('✅ HLS.js 지원됨, HLS 인스턴스 생성')
      
      // 기존 HLS 인스턴스 정리
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }

      // 새 HLS 인스턴스 생성
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,  // 90초 백버퍼 유지
      })
      
      hlsRef.current = hls
      hls.loadSource(hlsPlaylistUrl)
      hls.attachMedia(video)

      // 이벤트 리스너
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS 플레이리스트 파싱 완료, 재생 시작')
        video.play().catch(err => {
          console.warn('자동 재생 실패 (사용자 인터랙션 필요):', err)
        })
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('❌ HLS 오류:', data)
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
              console.error('복구 불가능한 오류, HLS 인스턴스 재생성 필요')
              setStreamError('스트림 오류가 발생했습니다.')
              break
          }
        }
      })

      // 정리 함수
      return () => {
        console.log('🧹 HLS 인스턴스 정리')
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 네이티브 HLS 지원
      console.log('✅ Safari 네이티브 HLS 지원')
      video.src = hlsPlaylistUrl
      video.play().catch(err => {
        console.warn('자동 재생 실패:', err)
      })
    } else {
      console.error('❌ HLS가 지원되지 않는 브라우저입니다')
      setStreamError('이 브라우저는 HLS를 지원하지 않습니다.')
    }
  }, [useHLS, hlsPlaylistUrl])

  // 스트림 URL이 변경되면 모니터링 재시작 (MJPEG 방식)
  useEffect(() => {
    if (!useHLS && streamUrl) {
      startStreamMonitoring()
    } else {
      stopStreamMonitoring()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useHLS, streamUrl])

  return (
    <div className="p-8">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <MonitorPlay className="w-8 h-8 text-primary-600" />
            <h1 className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent text-3xl font-bold">
              모니터링
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {!streamUrl && !hlsPlaylistUrl ? (
              <>
                <button
                  onClick={useHLS ? handleStartHLSStream : handleStartFakeStream}
                  disabled={isStartingStream}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  {isStartingStream ? '스트림 시작 중...' : useHLS ? 'HLS 스트림 시작' : '스트림 시작'}
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  비디오 업로드
                </button>
              </>
            ) : (
              <button
                onClick={handleStopStream}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                스트림 중지
              </button>
            )}

            <button
              onClick={handleResetMonitoringData}
              disabled={isResettingData}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertTriangle className="w-4 h-4" />
              {isResettingData ? '데이터 초기화 중...' : '데이터 초기화'}
            </button>
          </div>
        </div>
        <p className="text-gray-600">AI가 아이의 행동을 분석합니다</p>
        
        {/* 에러 메시지 */}
        {streamError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{streamError}</span>
              <button
                onClick={() => setStreamError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {resetMessage && (
          <div className="mt-3 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              <span>{resetMessage}</span>
              <button
                onClick={() => setResetMessage(null)}
                className="ml-auto text-blue-500 hover:text-blue-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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
              {/* HLS 비디오 플레이어 */}
              {useHLS && (
                <video
                  ref={videoRef}
                  className={`w-full h-full object-contain ${hlsPlaylistUrl ? 'block' : 'hidden'}`}
                  controls
                  muted={isMuted}
                  autoPlay
                  playsInline
                  style={{ 
                    display: hlsPlaylistUrl ? 'block' : 'none',
                  }}
                />
              )}
              
              {/* MJPEG 이미지 스트림 (레거시) */}
              {!useHLS && (
                <img
                  ref={streamImgRef}
                  src={streamUrl || undefined}
                  alt="Live Stream"
                  className={`w-full h-full object-contain ${streamUrl ? 'block' : 'hidden'}`}
                  onError={handleStreamError}
                  onLoad={handleStreamLoad}
                  style={{ 
                    display: streamUrl ? 'block' : 'none',
                    visibility: streamUrl ? 'visible' : 'hidden'
                  }}
                />
              )}
              
              {!isStreamActive && reconnectAttempts > 0 && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-sm">스트림 재연결 중... ({reconnectAttempts}/5)</p>
                  </div>
                </div>
              )}
              {!streamUrl && (
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
                      비디오 파일을 업로드하여 스트리밍을 시작하세요
                    </p>
                  </div>
                </div>
              )}

              {/* Live Indicator */}
              {(streamUrl || hlsPlaylistUrl) && (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-danger-500 to-danger-600 text-white px-3 py-1.5 rounded-full shadow-lg"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">LIVE</span>
                  {useHLS && <span className="text-xs opacity-80">(HLS)</span>}
                </motion.div>
              )}

              {/* AI Detection Overlay */}
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg border border-white/20">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-safe" />
                  <span>AI 분석 중...</span>
                </div>
              </div>

              {/* 실시간 위험 알림 (최신 danger 이벤트만 표시) */}
              {(streamUrl || hlsPlaylistUrl) && realtimeEvents.length > 0 && (() => {
                const latestDangerEvent = realtimeEvents.find(e => e.severity === 'danger')
                if (!latestDangerEvent) return null
                
                return (
                  <div className="absolute bottom-20 left-4 right-4 space-y-2">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-red-600/90 text-white px-4 py-2 rounded-lg flex items-center gap-3 shadow-lg"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm">{latestDangerEvent.title}</span>
                    </motion.div>
                  </div>
                )
              })()}

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
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
                    <span className="text-white text-sm ml-2">
                      {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!streamUrl && !hlsPlaylistUrl ? (
                      <>
                        <button
                          onClick={useHLS ? handleStartHLSStream : handleStartFakeStream}
                          disabled={isStartingStream}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                          <MonitorPlay className="w-4 h-4" />
                          {isStartingStream ? '시작 중...' : useHLS ? 'HLS 스트림 시작' : '스트림 시작'}
                        </button>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
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

          {/* AI Analysis Summary - 최신 Gemini 이벤트 기반 */}
          {realtimeEvents.length > 0 && realtimeEvents.find(e => e.metadata?.gemini_analysis) && (
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
              {(() => {
                const latestGeminiEvent = realtimeEvents.find(e => e.metadata?.gemini_analysis)
                const currentActivity = latestGeminiEvent?.metadata?.current_activity
                const safetyStatus = latestGeminiEvent?.metadata?.safety_status
                
                return (
                  <div className="grid grid-cols-3 gap-4">
                    <AnalysisStat
                      label="현재 활동"
                      value={currentActivity?.description?.split('.')[0] || '분석 중'}
                      icon={Activity}
                      color={latestGeminiEvent?.severity === 'safe' ? 'safe' : 'warning'}
                    />
                    <AnalysisStat
                      label="안전 상태"
                      value={
                        safetyStatus?.level === 'safe' ? '안전' :
                        safetyStatus?.level === 'warning' ? '주의' :
                        safetyStatus?.level === 'danger' ? '위험' : '확인 중'
                      }
                      icon={AlertTriangle}
                      color={
                        safetyStatus?.level === 'safe' ? 'safe' :
                        safetyStatus?.level === 'warning' ? 'warning' : 'primary'
                      }
                    />
                    <AnalysisStat
                      label="위치"
                      value={latestGeminiEvent?.location || '알 수 없음'}
                      icon={MapPin}
                      color="primary"
                    />
                  </div>
                )
              })()}
            </motion.div>
          )}
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
              {isLoadingData ? (
                <div className="text-center py-4 text-gray-500">
                  <Activity className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">데이터 로딩 중...</p>
                </div>
              ) : realtimeEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">아직 이벤트가 없습니다</p>
                  <p className="text-xs mt-1">스트림을 시작하면 실시간 이벤트가 표시됩니다</p>
                </div>
              ) : (
                realtimeEvents.slice(0, 10).map((event) => (
                  <AlertItem
                    key={event.id}
                    type={event.severity}
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
              {isLoadingData ? (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">타임라인 로딩 중...</p>
                </div>
              ) : realtimeEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">활동 기록이 없습니다</p>
                </div>
              ) : (
                realtimeEvents.slice(0, 8).map((event) => (
                  <TimelineItem
                    key={event.id}
                    time={formatTime(event.timestamp)}
                    activity={event.description}
                    status={event.severity}
                  />
                ))
              )}
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
                <QuickStat 
                  label="오늘 알림" 
                  value={`${monitoringStats?.today_total_events || 0}건`} 
                />
                <QuickStat 
                  label="위험 이벤트" 
                  value={`${monitoringStats?.danger_events || 0}건`} 
                />
                <QuickStat 
                  label="최근 1시간" 
                  value={`${monitoringStats?.recent_hour_events || 0}건`} 
                />
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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  재생 속도: {streamSpeed}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={streamSpeed}
                  onChange={(e) => setStreamSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.5x</span>
                  <span>1x</span>
                  <span>1.5x</span>
                  <span>2x</span>
                  <span>2.5x</span>
                  <span>3x</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="loop"
                  checked={streamLoop}
                  onChange={(e) => setStreamLoop(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="loop" className="text-sm text-gray-700">
                  비디오 반복 재생
                </label>
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
  type: 'danger' | 'warning' | 'info' | 'safe'
  message: string
  time: string
}) {
  const typeConfig = {
    danger: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
    warning: { bg: 'bg-warning-50', icon: 'text-warning', border: 'border-warning-200' },
    info: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    safe: { bg: 'bg-safe-50', icon: 'text-safe', border: 'border-safe-200' },
  }

  const config = typeConfig[type] || typeConfig.info // fallback to info if type is unknown

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
  status: 'danger' | 'safe' | 'warning' | 'info'
}) {
  const statusColors = {
    danger: 'bg-red-500',
    safe: 'bg-safe',
    warning: 'bg-warning',
    info: 'bg-blue-500',
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${statusColors[status] || statusColors.info}`}></div>
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
      <span className="text-sm text-primary-100">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}

