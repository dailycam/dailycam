import { useState } from 'react'
import { X, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react'

interface VideoPlayerProps {
  title: string
  videoUrl?: string
  onClose: () => void
}

export default function VideoPlayer({ title, videoUrl, onClose }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30) // Mock duration

  const progress = (currentTime / duration) * 100

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Video Container */}
        <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
          <div className="relative aspect-video bg-gray-900">
            {videoUrl ? (
              <video className="w-full h-full" src={videoUrl} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Play className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">하이라이트 영상</p>
                  <p className="text-sm mt-2">실제 구현 시 비디오 스트림 표시</p>
                </div>
              </div>
            )}

            {/* AI Analysis Overlay */}
            <div className="absolute top-4 left-4 right-4">
              <div className="bg-black/70 text-white px-4 py-3 rounded-lg backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-danger rounded-full mt-2 animate-pulse"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">AI 분석 결과</p>
                    <p className="text-xs text-gray-300">
                      14:23:15 - 아이가 주방 데드존에 접근했습니다. 
                      가스레인지 근처에서 약 15초간 머물렀습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detection Box (Example) */}
            <div className="absolute top-1/3 left-1/3 w-32 h-48 border-4 border-danger rounded-lg">
              <div className="absolute -top-7 left-0 bg-danger text-white text-xs px-2 py-1 rounded">
                위험 감지
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-900 p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-1.5 cursor-pointer">
                <div
                  className="bg-primary-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                  )}
                </button>
                <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Info */}
        <div className="mt-4 bg-white/5 rounded-lg p-4 backdrop-blur-sm">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400 mb-1">발생 시간</p>
              <p className="text-sm font-semibold text-white">오후 2:23</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">위치</p>
              <p className="text-sm font-semibold text-white">주방 입구</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">위험도</p>
              <p className="text-sm font-semibold text-danger">높음</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

