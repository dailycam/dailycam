import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface HLSVideoPlayerProps {
  src: string
  autoPlay?: boolean
  muted?: boolean
  onPlay?: () => void
  onPause?: () => void
  onError?: (error: string) => void
  className?: string
  keepAliveOnHidden?: boolean  // 탭 비활성화 시에도 재생 유지 (모니터링 페이지용)
}

export default function HLSVideoPlayer({
  src,
  autoPlay = true,
  muted = false,
  onPlay,
  onPause,
  onError,
  className = '',
  keepAliveOnHidden = false,  // 기본값: 탭 전환 시 멈춤 (트래픽 절약)
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    // src가 변경되지 않았으면 재초기화하지 않음 (페이지 이동 시에도 유지)
    const prevSrc = video.getAttribute('data-hls-src')
    if (prevSrc === src && hlsRef.current) {
      console.log('[HLS Player] src 동일, 재초기화 스킵:', src)
      return
    }

    console.log('[HLS Player] 초기화:', src)
    video.setAttribute('data-hls-src', src)
    setIsLoading(true)
    setError(null)

    // HLS.js 지원 확인
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // 라이브 스트리밍 최적화 설정 (버퍼 증가로 끊김 방지)
        backBufferLength: 20,        // 이미 재생한 20초 유지 (10 → 20)
        maxBufferLength: 30,          // 앞으로 30초 미리 다운로드 (10 → 30)
        maxMaxBufferLength: 60,       // 최대 60초까지 (20 → 60)
        liveBackBufferLength: 10,     // 라이브 모드에서는 10초 유지 (5 → 10)
        liveSyncDurationCount: 5,     // 라이브 엣지와의 동기화 완화 (3 → 5)
        liveMaxLatencyDurationCount: 15, // 최대 지연 허용 증가 (10 → 15)
        // 재시도 설정
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 10,
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 10,
        fragLoadingRetryDelay: 1000,
      })

      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[HLS Player] 매니페스트 로드 완료')
        setIsLoading(false)
        
        // 저장된 시간으로 seek 시도 (HLS는 라이브 스트림이므로 제한적)
        if (targetTime !== null && keepAliveOnHidden) {
          // HLS는 라이브 스트림이므로 seek가 제한적
          // 가능한 범위 내에서 seek 시도
          setTimeout(() => {
            if (video.duration > 0) {
              const seekTime = Math.min(targetTime!, video.duration - 1)
              if (seekTime > 0 && seekTime < video.duration) {
                console.log(`[HLS Player] seek 시도: ${seekTime.toFixed(1)}초`)
                video.currentTime = seekTime
              }
            }
          }, 1000)
        }
        
        if (autoPlay) {
          video.play().catch(e => {
            console.log('[HLS Player] 자동 재생 실패 (사용자 상호작용 필요):', e)
          })
        }
      })

      // 재생 시간 주기적으로 저장 (keepAliveOnHidden일 때만)
      if (keepAliveOnHidden) {
        timeUpdateIntervalRef.current = setInterval(() => {
          if (video && !video.paused && video.currentTime > 0) {
            const data = {
              videoTime: video.currentTime,
              timestamp: Date.now()
            }
            sessionStorage.setItem(storageKey, JSON.stringify(data))
          }
        }, 2000)  // 2초마다 저장
      }

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[HLS Player] 에러:', data.type, data.details)

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // 404 에러는 스트림이 중지된 것으로 간주
              if (data.details === 'manifestLoadError' || data.details === 'levelLoadError') {
                console.log('[HLS Player] 스트림 중지 감지 (404)')
                const errorMsg = '스트림이 중지되었습니다'
                setError(errorMsg)
                if (onError) onError(errorMsg)
                hls.destroy()
                return
              }
              
              console.log('[HLS Player] 네트워크 에러, 재시도 중...')
              setError('네트워크 연결 문제 - 재연결 시도 중...')
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad()
                }
              }, 3000)
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HLS Player] 미디어 에러, 복구 시도 중...')
              setError('미디어 에러 - 복구 시도 중...')
              hls.recoverMediaError()
              setTimeout(() => setError(null), 3000)
              break
            default:
              console.error('[HLS Player] 복구 불가능한 에러')
              const errorMsg = '스트림 에러 - 재시작 필요'
              setError(errorMsg)
              if (onError) onError(errorMsg)
              hls.destroy()
              break
          }
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // 네이티브 HLS 지원 (Safari)
      console.log('[HLS Player] Safari 네이티브 HLS 사용')
      
      // 저장된 시간으로 seek 시도
      if (targetTime !== null && keepAliveOnHidden) {
        setTimeout(() => {
          if (video.duration > 0) {
            const seekTime = Math.min(targetTime!, video.duration - 1)
            if (seekTime > 0 && seekTime < video.duration) {
              console.log(`[HLS Player] seek 시도: ${seekTime.toFixed(1)}초`)
              video.currentTime = seekTime
            }
          }
        }, 1000)
      }
      
      video.src = src
      
      // 재생 시간 주기적으로 저장 (keepAliveOnHidden일 때만)
      if (keepAliveOnHidden) {
        timeUpdateIntervalRef.current = setInterval(() => {
          if (video && !video.paused && video.currentTime > 0) {
            const data = {
              videoTime: video.currentTime,
              timestamp: Date.now()
            }
            sessionStorage.setItem(storageKey, JSON.stringify(data))
          }
        }, 2000)
      }
      
      video.addEventListener('loadedmetadata', () => {
        console.log('[HLS Player] 메타데이터 로드 완료')
        setIsLoading(false)
        if (autoPlay) {
          video.play().catch(e => {
            console.log('[HLS Player] 자동 재생 실패:', e)
          })
        }
      })
    } else {
      const errorMsg = 'HLS를 지원하지 않는 브라우저입니다'
      console.error('[HLS Player]', errorMsg)
      setError(errorMsg)
      if (onError) onError(errorMsg)
    }

    // Page Visibility API 연동 (keepAliveOnHidden=false일 때만)
    // 탭 비활성화 시 스트림 로딩 중지 - 트래픽 절약
    const handleVisibilityChange = () => {
      const currentVideo = videoRef.current
      if (!currentVideo) return

      // keepAliveOnHidden=true면 탭 전환해도 계속 재생 (모니터링 페이지용)
      if (keepAliveOnHidden) {
        // 재생 시간 저장
        if (!currentVideo.paused && currentVideo.currentTime > 0) {
          const data = {
            videoTime: currentVideo.currentTime,
            timestamp: Date.now()
          }
          sessionStorage.setItem(storageKey, JSON.stringify(data))
        }
        return
      }

      if (!hlsRef.current || !currentVideo) return

      if (document.hidden) {
        if (!currentVideo.paused) {
          console.log('[HLS Player] 탭 비활성화: 절전 모드 진입 (스트림 중지)')
          currentVideo.pause() // 비디오 일시정지
          hlsRef.current.stopLoad() // 네트워크 요청 중단
        }
      } else {
        console.log('[HLS Player] 탭 활성화: 스트림 재개')
        hlsRef.current.startLoad() // 네트워크 요청 재개
        if (autoPlay) {
          currentVideo.play().catch(e => console.log('자동 재생 재개 실패:', e))
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 클린업
    return () => {
      // keepAliveOnHidden일 때는 HLS 인스턴스를 파괴하지 않음 (페이지 이동 시에도 유지)
      if (keepAliveOnHidden) {
        // 재생 시간 저장
        if (video && video.currentTime > 0) {
          const data = {
            videoTime: video.currentTime,
            timestamp: Date.now()
          }
          sessionStorage.setItem(storageKey, JSON.stringify(data))
          console.log(`[HLS Player] 페이지 떠남, 재생 시간 저장: ${video.currentTime.toFixed(1)}초 (인스턴스 유지)`)
        }
        // HLS 인스턴스는 파괴하지 않음
        return
      }

      // keepAliveOnHidden이 false일 때만 정리
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, autoPlay, onError, keepAliveOnHidden])

  // 비디오 이벤트 핸들러
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      console.log('[HLS Player] 재생 시작')
      if (onPlay) onPlay()
    }

    const handlePause = () => {
      console.log('[HLS Player] 일시정지')
      if (onPause) onPause()
    }

    const handleWaiting = () => {
      console.log('[HLS Player] 버퍼링 중...')
    }

    const handlePlaying = () => {
      console.log('[HLS Player] 재생 중')
      setError(null)
    }

    const handleError = () => {
      console.error('[HLS Player] 비디오 엘리먼트 에러')
      setError('비디오 재생 오류')
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('error', handleError)
    }
  }, [onPlay, onPause])

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className={`w-full h-full object-contain bg-black ${className}`}
        muted={muted}
        playsInline
        controls
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div>
            <p className="text-white">스트림 로딩 중...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

