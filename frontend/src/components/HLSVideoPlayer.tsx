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
}

export default function HLSVideoPlayer({
  src,
  autoPlay = true,
  muted = false,
  onPlay,
  onPause,
  onError,
  className = '',
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    console.log('[HLS Player] 초기화:', src)
    setIsLoading(true)
    setError(null)

    // HLS.js 지원 확인
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // 라이브 스트리밍 최적화 설정
        backBufferLength: 10,        // 이미 재생한 10초만 유지 (90 → 10)
        maxBufferLength: 10,          // 앞으로 10초만 미리 다운로드 (30 → 10)
        maxMaxBufferLength: 20,       // 최대 20초까지만 (60 → 20)
        liveBackBufferLength: 5,      // 라이브 모드에서는 5초만 유지
        liveSyncDurationCount: 3,     // 라이브 엣지와의 동기화 (3개 세그먼트)
        liveMaxLatencyDurationCount: 10, // 최대 지연 허용 (10개 세그먼트)
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
        if (autoPlay) {
          video.play().catch(e => {
            console.log('[HLS Player] 자동 재생 실패 (사용자 상호작용 필요):', e)
          })
        }
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[HLS Player] 에러:', data.type, data.details)
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
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
      video.src = src
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

    // 클린업
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, autoPlay, onError])

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

