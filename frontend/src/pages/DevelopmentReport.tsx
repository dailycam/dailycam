import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Baby,
  Lightbulb,
  Video,
  Sparkles,
  TrendingUp,
  Download,
  Calendar as CalendarIcon,
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'

export default function DevelopmentReport() {
  const [date, setDate] = useState<Date>(new Date())

  // 개인 발달 5각형 데이터
  const radarData = [
    { category: '언어', score: 88, fullMark: 100 },
    { category: '운동', score: 92, fullMark: 100 },
    { category: '인지', score: 85, fullMark: 100 },
    { category: '사회성', score: 90, fullMark: 100 },
    { category: '정서', score: 87, fullMark: 100 },
  ]

  // 최고점수를 가진 영역 찾기
  const maxScore = Math.max(...radarData.map(item => item.score))
  const strongestArea = radarData.find(item => item.score === maxScore)

  const dailyDevelopmentFrequency = [
    { category: '언어', count: 18, color: '#0284c7' },
    { category: '운동', count: 25, color: '#22c55e' },
    { category: '인지', count: 12, color: '#f59e0b' },
    { category: '사회성', count: 15, color: '#0ea5e9' },
    { category: '정서', count: 9, color: '#06b6d4' },
  ]

  const recommendedActivities = [
    {
      title: '까꿍 놀이',
      category: '인지 발달',
      icon: '👀',
      description: '대상 영속성 개념을 발달시키는 데 도움이 됩니다.',
      duration: '10-15분',
      benefit: '인지 능력 향상',
      gradient: 'from-warning-50 to-orange-50',
    },
    {
      title: '배밀이 연습',
      category: '운동 발달',
      icon: '🤸',
      description: '좋아하는 장난감을 앞에 두고 손을 뻗게 유도하세요.',
      duration: '15-20분',
      benefit: '대근육 발달',
      gradient: 'from-safe-50 to-green-50',
    },
    {
      title: '노래 부르기',
      category: '언어 발달',
      icon: '🎵',
      description: '다양한 동요와 자장가를 들려주세요.',
      duration: '5-10분',
      benefit: '언어 자극',
      gradient: 'from-primary-50 to-blue-50',
    },
    {
      title: '촉각 놀이',
      category: '감각 발달',
      icon: '✋',
      description: '다양한 질감의 천이나 장난감을 만지게 해주세요.',
      duration: '10분',
      benefit: '감각 발달',
      gradient: 'from-primary-50 to-cyan-50',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Baby className="w-8 h-8 text-primary-600" />
            <h1 className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent text-3xl font-bold">
              발달 리포트
            </h1>
          </div>
          <p className="text-gray-600">AI 분석 기반 영유아 발달 현황을 확인하세요</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2 border-primary-200 hover:border-primary-300 hover:bg-primary-50">
            <CalendarIcon className="w-4 h-4" />
            {date.toLocaleDateString('ko-KR')}
          </button>
          <button className="btn-primary flex items-center gap-2 shadow-md">
            <Download className="w-4 h-4" />
            리포트 다운로드
          </button>
        </div>
      </motion.div>

      {/* AI Daily Summary & Development Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="card p-8 bg-gradient-to-br from-primary-50 via-blue-50 to-cyan-50 border-0 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-200/30 to-blue-200/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-200/30 to-primary-200/30 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-primary-600" />
                <h2 className="text-primary-900 text-xl font-semibold">오늘의 발달 요약</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-700 leading-relaxed mb-6">
                <p className="flex items-start gap-2">
                  <span className="text-xl">🎯</span>
                  <span>
                    오늘 아이는 총 <span className="text-primary-600 font-semibold">79건</span>의 발달 행동이 관찰되었으며, 특히 운동 발달 영역에서 활발한 움직임을 보였습니다.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-xl">🌟</span>
                  <span>
                    오전 9시경 시각 추적 능력이 눈에 띄게 향상되었고, 오후 3시에는 배밀이 자세로 약{' '}
                    <span className="text-primary-600 font-semibold">2미터 이동</span>하는 모습이 포착되었습니다. 이는 대근육 발달의 중요한 이정표입니다.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-xl">💬</span>
                  <span>
                    언어 발달에서도 다양한 음절의 옹알이가 18회 관찰되어 지난주 대비{' '}
                    <span className="text-primary-600 font-semibold">20% 증가</span>했습니다. 전반적으로 또래 평균보다 우수한 발달을 보이고 있습니다.
                  </span>
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-primary-100">
                <p className="text-xs text-primary-600 mb-2 font-semibold">💡 AI 발달 인사이트</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                  <p className="flex items-start gap-1">
                    <span>•</span>
                    <span>이번 주 언어 발달 영역에서 눈에 띄는 향상이 관찰되었습니다.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span>•</span>
                    <span>운동 발달이 또래 평균보다 앞서 있습니다. 안전한 환경에서 더 많은 활동 기회를 제공해보세요.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span>•</span>
                    <span>규칙적인 수면 패턴이 정서 발달에 긍정적인 영향을 주고 있습니다.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span>•</span>
                    <span>추천: 다양한 소리와 음악을 들려주면 언어 발달에 도움이 됩니다.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-cyan-50 border-0 shadow-xl h-full">
            <div className="text-center h-full flex flex-col justify-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Baby className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <p className="text-sm text-gray-600 mb-2">현재 발달 단계</p>
              <p className="text-primary-600 mb-4 text-2xl font-bold">7개월</p>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-safe" />
                  <p className="text-sm text-gray-700 font-medium">발달 강점</p>
                </div>
                <p className="text-base text-gray-800 leading-relaxed">
                  지수는 <span className="text-safe font-semibold">{strongestArea?.category} 발달</span>에서 강점을 보여주네요! 🌟
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="card p-8 border-0 shadow-lg h-full flex flex-col min-h-[600px]">
            <div className="mb-6 h-8">
              <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
                영역별 발달 분석
              </h3>
              <p className="text-sm text-gray-600">우리 아이의 5가지 발달 영역 현황입니다</p>
            </div>

            <div className="flex items-center justify-center flex-1 min-h-0 py-4">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <PolarGrid stroke="#e5e7eb" strokeWidth={1.5} />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} tickCount={6} />
                  <Radar
                    dataKey="score"
                    stroke="#0284c7"
                    fill="url(#radarGradient)"
                    fillOpacity={0.7}
                    strokeWidth={2.5}
                    dot={{ fill: '#0284c7', strokeWidth: 2, r: 4, stroke: '#fff' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {radarData.map((item, index) => (
                <div key={index} className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-gray-600 mb-1">{item.category}</p>
                  <p className="text-lg text-primary-600 font-semibold">{item.score}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="card p-8 border-0 shadow-lg h-full flex flex-col min-h-[600px]">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold h-8">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-cyan-400 rounded-full" />
              금일 발달 행동 빈도
            </h3>
            <div className="flex items-center justify-center flex-1 min-h-0 py-4">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dailyDevelopmentFrequency}>
                  <defs>
                    {dailyDevelopmentFrequency.map((item, index) => (
                      <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={item.color} stopOpacity={0.9} />
                        <stop offset="95%" stopColor={item.color} stopOpacity={0.5} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="count" name="감지 횟수" radius={[8, 8, 0, 0]}>
                    {dailyDevelopmentFrequency.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {dailyDevelopmentFrequency.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-full h-2 rounded-full mb-1" style={{ backgroundColor: item.color }} />
                  <p className="text-xs text-gray-600">{item.category}</p>
                  <p className="text-sm font-semibold" style={{ color: item.color }}>
                    {item.count}회
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI Recommended Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="card p-6 mb-8 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="w-6 h-6 text-warning" />
            <h3 className="text-lg font-semibold">AI 추천 발달 촉진 놀이</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedActivities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className={`p-5 bg-gradient-to-br ${activity.gradient} rounded-2xl border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-1`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{activity.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-gray-800 font-semibold">{activity.title}</h4>
                      <span className="text-xs px-3 py-1 bg-white/80 text-gray-700 rounded-full shadow-sm">
                        {activity.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{activity.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">⏱ {activity.duration}</span>
                      <span className="flex items-center gap-1">✨ {activity.benefit}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
