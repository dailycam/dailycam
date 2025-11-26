import { useState } from 'react'
import { motion } from 'motion/react'
import { Play, Download, Share2, TrendingUp, Shield, Calendar, Clock, Film } from 'lucide-react'

export default function ClipHighlights() {
  const [selectedClip, setSelectedClip] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'development' | 'safety'>('development')

  const developmentClips = [
    {
      id: 'dev-1',
      title: '배밀이 자세로 2미터 이동',
      category: '운동 발달',
      timestamp: '2024-11-19 15:23',
      duration: '0:45',
      thumbnail: '🤸',
      description: '아기가 배밀이 자세로 약 2미터를 이동하는 모습이 포착되었습니다. 대근육 발달의 중요한 이정표입니다.',
      importance: 'high',
      color: 'safe',
    },
    {
      id: 'dev-2',
      title: '혼자 앉기 시도',
      category: '운동 발달',
      timestamp: '2024-11-19 14:23',
      duration: '0:38',
      thumbnail: '🪑',
      description: '아기가 처음으로 혼자 앉으려는 시도를 했습니다. 균형 감각이 발달하고 있습니다.',
      importance: 'high',
      color: 'safe',
    },
    {
      id: 'dev-3',
      title: '다양한 옹알이 소리',
      category: '언어 발달',
      timestamp: '2024-11-19 12:10',
      duration: '1:15',
      thumbnail: '🗣️',
      description: '여러 음절의 옹알이가 관찰되었습니다. "바바", "마마" 등의 소리를 반복했습니다.',
      importance: 'medium',
      color: 'primary',
    },
    {
      id: 'dev-4',
      title: '눈 맞춤 및 웃음 반응',
      category: '사회성 발달',
      timestamp: '2024-11-19 09:45',
      duration: '0:52',
      thumbnail: '😊',
      description: '부모와의 상호작용 중 활발한 눈 맞춤과 웃음 반응을 보였습니다.',
      importance: 'medium',
      color: 'primary',
    },
    {
      id: 'dev-5',
      title: '장난감 손 뻗기 및 잡기',
      category: '인지 발달',
      timestamp: '2024-11-19 09:15',
      duration: '1:05',
      thumbnail: '🧸',
      description: '목표물을 향해 손을 뻗고 성공적으로 잡는 행동이 관찰되었습니다.',
      importance: 'medium',
      color: 'warning',
    },
  ]

  const safetyClips = [
    {
      id: 'safe-1',
      title: '침대 가장자리 접근',
      category: '주의',
      timestamp: '2024-11-19 13:45',
      duration: '0:28',
      thumbnail: '⚠️',
      description: '아기가 침대 가장자리에 접근했습니다. 이후 안전한 영역으로 복귀했습니다.',
      importance: 'warning',
      color: 'warning',
    },
    {
      id: 'safe-2',
      title: '활발한 움직임 감지',
      category: '주의',
      timestamp: '2024-11-19 11:20',
      duration: '0:35',
      thumbnail: '🏃',
      description: '평소보다 활발한 움직임이 감지되었습니다. 안전 상태 모니터링 강화됨.',
      importance: 'warning',
      color: 'warning',
    },
    {
      id: 'safe-3',
      title: '안전한 수면 자세 확인',
      category: '권장',
      timestamp: '2024-11-19 08:30',
      duration: '0:15',
      thumbnail: '😴',
      description: '바른 자세로 안전하게 수면 중인 모습입니다.',
      importance: 'info',
      color: 'safe',
    },
    {
      id: 'safe-4',
      title: '정상 기상',
      category: '권장',
      timestamp: '2024-11-19 06:00',
      duration: '0:42',
      thumbnail: '🌅',
      description: '정상적으로 기상하는 모습이 관찰되었습니다.',
      importance: 'info',
      color: 'safe',
    },
  ]

  const renderClipCard = (clip: typeof developmentClips[0], type: 'development' | 'safety') => {
    const bgColor =
      clip.importance === 'high'
        ? 'bg-safe-50 border-safe-200'
        : clip.importance === 'warning'
          ? 'bg-warning-50 border-warning-200'
          : 'bg-primary-50 border-primary-200'

    const badgeColor =
      clip.importance === 'high'
        ? 'bg-safe-200 text-safe-dark'
        : clip.importance === 'warning'
          ? 'bg-warning-200 text-warning-dark'
          : 'bg-primary-200 text-primary-700'

    return (
      <div
        key={clip.id}
        className={`card p-4 ${bgColor} border-2 hover:shadow-md transition-shadow cursor-pointer`}
        onClick={() => setSelectedClip(clip.id)}
      >
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center text-4xl">
            {clip.thumbnail}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="mb-1 font-semibold text-gray-900">{clip.title}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded ${badgeColor}`}>{clip.category}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {clip.duration}
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
              {clip.timestamp}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
          <button className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2">
            <Download className="w-3 h-3" />
            다운로드
          </button>
          <button className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2">
            <Share2 className="w-3 h-3" />
            공유
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Film className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">클립 하이라이트</h1>
        </div>
        <p className="text-gray-600">AI가 자동으로 생성한 중요한 순간들을 확인하세요</p>
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
                <p className="text-primary-600 text-xl font-bold">7분 23초</p>
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
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'development'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            발달 클립 ({developmentClips.length})
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'safety' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'
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
                AI가 분석한 중요한 발달 이정표와 행동 패턴을 자동으로 클립으로 저장했습니다. 각 클립은 언어, 운동, 인지, 사회성 등의 발달 영역별로 분류되어 있습니다.
              </p>
            </div>
            <div className="space-y-4">
              {developmentClips.map((clip) => renderClipCard(clip, 'development'))}
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
              {safetyClips.map((clip) => renderClipCard(clip, 'safety'))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Video Player Modal Placeholder */}
      {selectedClip && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedClip(null)}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-gray-900 rounded-lg mb-4 flex items-center justify-center">
              <div className="text-white text-center">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>영상 플레이어</p>
                <p className="text-sm opacity-50 mt-2">데모 환경에서는 실제 영상이 재생되지 않습니다</p>
              </div>
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
