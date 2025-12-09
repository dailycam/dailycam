import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Play, Download, Trash2, TrendingUp, Shield, Calendar, Clock, Film } from 'lucide-react'
import { getClipHighlights, deleteClip, HighlightClip } from '../lib/api'
import { API_BASE_URL } from '@/constants/api'

export default function ClipHighlights() {
  const [selectedClip, setSelectedClip] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'development' | 'safety'>('development')
  const [developmentClips, setDevelopmentClips] = useState<HighlightClip[]>([])
  const [safetyClips, setSafetyClips] = useState<HighlightClip[]>([])
  const [loading, setLoading] = useState(true)

  // 날짜 선택 state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableDates, setAvailableDates] = useState<Date[]>([])

  // 사용 가능한 날짜 목록 생성 (최근 7일)
  useEffect(() => {
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date)
    }
    setAvailableDates(dates)
  }, [])

  // API에서 클립 데이터 가져오기
  useEffect(() => {
    const fetchClips = async () => {
      try {
        setLoading(true)
        const targetDate = selectedDate.toISOString().split('T')[0] // YYYY-MM-DD
        const response = await getClipHighlights('all', 50, targetDate)

        const devClips = response.clips.filter(clip => clip.category === '발달')
        const safeClips = response.clips.filter(clip => clip.category === '안전')

        setDevelopmentClips(devClips)
        setSafetyClips(safeClips)
      } catch (error) {
        console.error('클립 데이터 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClips()
  }, [selectedDate]) // selectedDate가 변경될 때마다 재조회

  // 재생 시간 포맷팅
  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 날짜 포맷팅 (KST 시간대로 표시)
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul', // KST로 변환
    })
  }

  // 클립 다운로드 함수
  const handleDownload = async (clip: HighlightClip) => {
    try {
      // 비디오 파일 직접 다운로드 (정적 파일 서빙)
      const videoUrl = `${API_BASE_URL}${clip.video_url}`

      const a = document.createElement('a')
      a.href = videoUrl
      a.download = `${clip.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${clip.id}.mp4`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      console.error('다운로드 오류:', error)
      alert('다운로드에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 클립 삭제 함수
  const handleDelete = async (clip: HighlightClip) => {
    if (!confirm(`"${clip.title}" 클립을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await deleteClip(clip.id)
      alert('클립이 삭제되었습니다.')

      // 클립 목록 새로고침 (선택된 날짜 기준)
      const targetDate = selectedDate.toISOString().split('T')[0]
      const response = await getClipHighlights('all', 50, targetDate)
      const devClips = response.clips.filter(c => c.category === '발달')
      const safeClips = response.clips.filter(c => c.category === '안전')
      setDevelopmentClips(devClips)
      setSafetyClips(safeClips)
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('클립 삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const renderClipCard = (clip: HighlightClip) => {
    const bgColor =
      clip.importance === 'high'
        ? 'bg-safe-50 border-safe-200'
        : clip.importance === 'warning' || clip.category === '안전'
          ? 'bg-warning-50 border-warning-200'
          : 'bg-primary-50 border-primary-200'

    const badgeColor =
      clip.importance === 'high'
        ? 'bg-safe-200 text-safe-dark'
        : clip.importance === 'warning' || clip.category === '안전'
          ? 'bg-warning-200 text-warning-dark'
          : 'bg-primary-200 text-primary-700'

    return (
      <div
        key={clip.id}
        className={`card p-4 ${bgColor} border-2 hover:shadow-md transition-shadow cursor-pointer`}
        onClick={() => setSelectedClip(clip.id.toString())}
      >
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center text-4xl overflow-hidden">
            {clip.video_url ? (
              <video
                className="w-full h-full object-cover rounded-lg"
                src={`${API_BASE_URL}${clip.video_url}#t=5`}
                preload="metadata"
                muted
                playsInline
                onError={(e) => {
                  // 비디오 로드 실패 시 기본 이모지 표시
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentElement!.innerHTML = clip.category === '발달' ? '🎯' : '⚠️'
                }}
              />
            ) : clip.thumbnail_url ? (
              <img
                src={`${API_BASE_URL}${clip.thumbnail_url}`}
                alt={clip.title}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentElement!.innerHTML = clip.category === '발달' ? '🎯' : '⚠️'
                }}
              />
            ) : (
              clip.category === '발달' ? '🎯' : '⚠️'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="mb-1 font-semibold text-gray-900">{clip.title}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded ${badgeColor}`}>
                    {clip.sub_category || clip.category}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(clip.duration_seconds)}
                  </span>
                </div>
              </div>
              <button className="flex-shrink-0 p-2 hover:bg-white/80 rounded">
                <Play className="w-4 h-4 text-primary-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">{clip.description}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatDate(clip.created_at)}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDownload(clip)
            }}
            className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2"
          >
            <Download className="w-3 h-3" />
            다운로드
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(clip)
            }}
            className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            삭제
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">클립 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">클립 하이라이트</h1>
          </div>
          {/* 날짜 선택 드롭다운 */}
          <select
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {availableDates.map((date) => (
              <option key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                {date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
        <p className="text-gray-600">중요한 순간들을 확인하세요</p>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card p-6 bg-gradient-to-br from-safe-50 to-white">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-safe" />
              <div>
                <p className="text-sm text-gray-600">발달 클립</p>
                <p className="text-safe text-xl font-bold">{developmentClips.length}개</p>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="card p-6 bg-gradient-to-br from-warning-50 to-white">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-warning" />
              <div>
                <p className="text-sm text-gray-600">안전 클립</p>
                <p className="text-warning text-xl font-bold">{safetyClips.length}개</p>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-white">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary-600" />
              <div>
                <p className="text-sm text-gray-600">오늘 생성</p>
                <p className="text-primary-600 text-xl font-bold">{developmentClips.length + safetyClips.length}개</p>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-cyan-50">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary-600" />
              <div>
                <p className="text-sm text-gray-600">총 재생시간</p>
                <p className="text-primary-600 text-xl font-bold">
                  {formatDuration([...developmentClips, ...safetyClips].reduce((sum, clip) => sum + (clip.duration_seconds || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Clips Tabs */}
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('development')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'development'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            발달 클립 ({developmentClips.length})
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'safety' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            안전 클립 ({safetyClips.length})
          </button>
        </div>

        {activeTab === 'development' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="card p-6 bg-gradient-to-br from-safe-50 to-white mb-4">
              <h3 className="mb-2 text-safe-dark font-semibold">발달 클립 하이라이트</h3>
              <p className="text-sm text-gray-700">
                중요한 발달 이정표와 행동 패턴을 자동으로 클립으로 저장했습니다. 각 클립은 언어, 운동, 인지, 사회성 등의 발달 영역별로 분류되어 있습니다.
              </p>
            </div>
            <div className="space-y-4">
              {developmentClips.length > 0 ? (
                developmentClips.map((clip) => renderClipCard(clip))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>아직 발달 클립이 없습니다.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'safety' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="card p-6 bg-gradient-to-br from-warning-50 to-white mb-4">
              <h3 className="mb-2 text-warning-dark font-semibold">안전 클립 하이라이트</h3>
              <p className="text-sm text-gray-700">
                안전 관련 이벤트가 발생한 순간을 자동으로 기록했습니다. 위험도에 따라 권장, 주의, 위험, 사고발생으로 분류되며, 각 상황에 대한 AI 분석이 포함됩니다.
              </p>
            </div>
            <div className="space-y-4">
              {safetyClips.length > 0 ? (
                safetyClips.map((clip) => renderClipCard(clip))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>아직 안전 클립이 없습니다.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Video Player Modal */}
      {selectedClip && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedClip(null)}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-gray-900 rounded-lg mb-4 flex items-center justify-center">
              {(() => {
                const clip = [...developmentClips, ...safetyClips].find(c => c.id.toString() === selectedClip)
                return clip ? (
                  <video
                    key={clip.video_url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    src={`${API_BASE_URL}${clip.video_url}`}
                    onError={(e) => {
                      console.error('비디오 로드 실패:', clip.video_url)
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="text-white text-center">
                          <p class="text-red-400 mb-2">⚠️ 영상을 불러올 수 없습니다</p>
                          <p class="text-sm text-gray-400">${clip.video_url}</p>
                        </div>
                      `
                    }}
                  >
                    브라우저가 비디오 태그를 지원하지 않습니다.
                  </video>
                ) : (
                  <div className="text-white text-center">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>영상 플레이어</p>
                  </div>
                )
              })()}
            </div>
            <button onClick={() => setSelectedClip(null)} className="btn-primary w-full">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
