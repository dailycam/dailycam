import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Shield,
  CheckCircle,
  Clock,
  Eye,
  CheckSquare,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function SafetyReport() {
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week')

  // 주간 안전도 추이 데이터
  const weeklySafetyData = [
    { date: '월', 안전도: 90 },
    { date: '화', 안전도: 92 },
    { date: '수', 안전도: 88 },
    { date: '목', 안전도: 91 },
    { date: '금', 안전도: 93 },
    { date: '토', 안전도: 89 },
    { date: '일', 안전도: 92 },
  ]

  // 월간 안전도 추이 데이터
  const monthlySafetyData = [
    { date: '1주', 안전도: 88 },
    { date: '2주', 안전도: 90 },
    { date: '3주', 안전도: 91 },
    { date: '4주', 안전도: 92 },
  ]

  const currentData = periodType === 'week' ? weeklySafetyData : monthlySafetyData

  // 24시간 시계 데이터
  const clockData = Array.from({ length: 24 }, (_, hour) => {
    let safetyLevel: 'safe' | 'warning' | 'danger' | null = null
    let safetyScore = 95

    if (hour === 11) {
      safetyLevel = 'warning'
      safetyScore = 75
    } else if (hour === 13) {
      safetyLevel = 'warning'
      safetyScore = 70
    } else if (hour >= 0 && hour < 6 || hour >= 20 && hour < 24) {
      safetyLevel = 'safe'
      safetyScore = 98
    } else if (hour >= 6 && hour < 20) {
      safetyLevel = 'safe'
      safetyScore = 90
    }

    return {
      hour,
      safetyLevel,
      safetyScore,
    }
  })

  // 안전사고 유형 데이터
  const incidentTypeData = [
    { name: '낙상', value: 35, color: '#fca5a5', count: 2 }, // 조금 더 진한 파스텔 핑크
    { name: '충돌/부딛힘', value: 25, color: '#fdba74', count: 1 }, // 조금 더 진한 파스텔 오렌지
    { name: '끼임', value: 15, color: '#fde047', count: 0 }, // 조금 더 진한 파스텔 옐로우
    { name: '전도(가구 넘어짐)', value: 10, color: '#86efac', count: 0 }, // 조금 더 진한 파스텔 그린
    { name: '감전', value: 10, color: '#7dd3fc', count: 0 }, // 조금 더 진한 파스텔 스카이블루
    { name: '질식', value: 5, color: '#c4b5fd', count: 0 }, // 조금 더 진한 파스텔 퍼플
  ]

  // 안전 체크리스트
  const safetyChecklist = [
    {
      title: '모서리 가드 설치',
      icon: '🛡️',
      description: '아이가 가구를 잡고 서기 시작했습니다. 뾰족한 모서리에 가드를 설치해주세요.',
      priority: 'high',
      gradient: 'from-pink-50 to-rose-50',
      checked: false,
    },
    {
      title: '전기 콘센트 안전 장치',
      icon: '⚡',
      description: '전기 콘센트에 안전 장치가 설치돼있는지 확인해주세요.',
      priority: 'high',
      gradient: 'from-amber-50 to-orange-50',
      checked: true,
    },
    {
      title: '침대 낙상 방지',
      icon: '🛏️',
      description: '침대 가장자리 안전 패드가 제대로 고정되어 있는지 확인하세요.',
      priority: 'medium',
      gradient: 'from-yellow-50 to-amber-50',
      checked: false,
    },
    {
      title: '작은 물건 정리',
      icon: '🧸',
      description: '아이가 삼킬 수 있는 작은 물건들을 손이 닿지 않는 곳에 보관하세요.',
      priority: 'medium',
      gradient: 'from-emerald-50 to-teal-50',
      checked: true,
    },
  ]

  const currentSafetyScore = 92

  // 시계 바늘 각도 계산
  const getClockAngle = (hour: number) => {
    return hour * 30 - 90
  }

  // 12시간 형식으로 변환
  const formatClockHour = (hour: number) => {
    if (hour === 0) return 12
    if (hour > 12) return hour - 12
    return hour
  }

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'safe':
        return '#86efac' // 조금 더 진한 파스텔 그린
      case 'warning':
        return '#fcd34d' // 조금 더 진한 파스텔 옐로우
      case 'danger':
        return '#fca5a5' // 조금 더 진한 파스텔 핑크
      case 'critical':
        return '#f87171' // 조금 더 진한 핑크
      default:
        return '#e5e7eb'
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary-600" />
          <h1 className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent text-3xl font-bold">
            안전 리포트
          </h1>
        </div>
        <p className="text-gray-600">AI 분석 기반 영유아 안전 현황을 확인하세요</p>
      </motion.div>

      {/* Hero Section - 안전도 스코어 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-8">
        <div className="card p-8 bg-gradient-to-br from-sky-300 via-blue-400 via-cyan-400 to-blue-500 text-white overflow-hidden relative border-0 shadow-2xl">
          {/* 그라데이션 오버레이 효과 */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/40 via-transparent to-cyan-300/30" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-300/25 rounded-full blur-3xl -ml-48 -mb-48" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-300/15 rounded-full blur-3xl" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* 왼쪽: 안전도 스코어 */}
            <div className="text-center lg:text-left">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="inline-block">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-56 h-56 -rotate-90">
                    <circle cx="112" cy="112" r="100" stroke="rgba(255,255,255,0.2)" strokeWidth="12" fill="none" />
                    <motion.circle
                      cx="112"
                      cy="112"
                      r="100"
                      stroke="white"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 100}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 100 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - currentSafetyScore / 100) }}
                      transition={{ duration: 2, ease: 'easeOut' }}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Shield className="w-12 h-12 mb-3 opacity-90" />
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.8, delay: 0.6 }} className="text-center">
                      <span className="block text-5xl font-bold">92</span>
                      <span className="text-lg opacity-90">점</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-6">
                <h2 className="text-white mb-2 text-xl font-semibold">오늘의 안전도</h2>
                <p className="text-primary-100 text-sm">안전 상태 우수 · 위험 감지 0건 🛡️</p>
              </motion.div>
            </div>

            {/* 오른쪽: AI 요약 */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-6 h-6" />
                <h3 className="text-white font-semibold">AI 안전 분석</h3>
              </div>
              <div className="space-y-3 text-sm text-primary-50 leading-relaxed mb-4">
                <p className="flex items-start gap-2">
                  <span className="text-lg">✨</span>
                  <span>오늘 하루 아이의 안전 상태는 전반적으로 양호합니다. 총 2건의 주의 알림이 발생했으나 모두 정상 범위로 회복되었습니다.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-lg">🕐</span>
                  <span>오후 1시 45분경 침대 가장자리 접근이 감지되었으며, 이후 안전한 영역으로 복귀했습니다.</span>
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 mb-4">
                <p className="text-xs text-primary-100 mb-2 font-semibold">💡 AI 안전 권장사항</p>
                <div className="space-y-1.5 text-xs text-primary-50">
                  <p className="flex items-start gap-1">
                    <span>•</span>
                    <span>전반적으로 안전한 환경이 유지되고 있습니다.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span>•</span>
                    <span>오후 시간대에 활동량이 증가하므로 주변 환경을 더 자주 확인해주세요.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span>•</span>
                    <span>침대 가장자리 안전 패드 보강을 권장합니다.</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                <div className="text-center">
                  <p className="text-xs text-primary-100 mb-1">관찰 시간</p>
                  <p className="text-white text-lg font-semibold">06:00~22:00</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-primary-100 mb-1">주의 알림</p>
                  <p className="text-white text-lg font-semibold">2건</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-primary-100 mb-1">위험 감지</p>
                  <p className="text-white text-lg font-semibold">0건</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-primary-100 mb-1">사고 발생</p>
                  <p className="text-white text-lg font-semibold">0건</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 시계 형태 안전사고 분포 + 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 24시간 시계 */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.3 }}>
          <div className="card p-8 border-0 shadow-lg h-full flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between mb-6 h-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
                24시간 안전 현황
              </h3>
              <Clock className="w-5 h-5 text-primary-500" />
            </div>

            <div className="flex items-center justify-center flex-1 min-h-0 py-4">
              <svg width="320" height="320" className="relative max-w-full" viewBox="0 0 320 320">
                <circle cx="160" cy="160" r="140" fill="none" stroke="#f0f9ff" strokeWidth="28" />

                {clockData.map((data, index) => {
                  const angle = getClockAngle(data.hour)
                  const radian = (angle * Math.PI) / 180
                  const innerRadius = 126
                  const outerRadius = 154

                  const innerX = 160 + innerRadius * Math.cos(radian)
                  const innerY = 160 + innerRadius * Math.sin(radian)
                  const outerX = 160 + outerRadius * Math.cos(radian)
                  const outerY = 160 + outerRadius * Math.sin(radian)

                  const hasEvent = data.safetyLevel !== null
                  const isSelected = selectedHour === data.hour
                  const showLabel = data.hour % 3 === 0

                  return (
                    <g key={data.hour}>
                      <line
                        x1={innerX}
                        y1={innerY}
                        x2={outerX}
                        y2={outerY}
                        stroke={hasEvent ? getSeverityColor(data.safetyLevel) : '#e5e7eb'}
                        strokeWidth={hasEvent ? '7' : '2'}
                        strokeLinecap="round"
                      />

                      {showLabel && (
                        <text
                          x={160 + 110 * Math.cos(radian)}
                          y={160 + 110 * Math.sin(radian)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-xs"
                          fill={hasEvent ? getSeverityColor(data.safetyLevel) : '#9ca3af'}
                          fontWeight={hasEvent ? 'bold' : 'normal'}
                        >
                          {formatClockHour(data.hour)}
                        </text>
                      )}

                      {hasEvent && (
                        <motion.circle
                          cx={160 + 140 * Math.cos(radian)}
                          cy={160 + 140 * Math.sin(radian)}
                          r={isSelected ? '9' : '7'}
                          fill={getSeverityColor(data.safetyLevel)}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="cursor-pointer"
                          onMouseEnter={() => setSelectedHour(data.hour)}
                          onMouseLeave={() => setSelectedHour(null)}
                        />
                      )}
                    </g>
                  )
                })}

                <g>
                  <circle cx="160" cy="160" r="36" fill="url(#centerGradient)" />
                  <defs>
                    <linearGradient id="centerGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#7dd3fc" />
                    </linearGradient>
                  </defs>
                  <text x="160" y="152" textAnchor="middle" className="text-xs" fill="white" fontWeight="bold">
                    NOW
                  </text>
                  <text x="160" y="170" textAnchor="middle" className="text-sm" fill="white" fontWeight="bold">
                    {new Date().getHours()}:00
                  </text>
                </g>
              </svg>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
                <span className="text-gray-600">안전 (90+)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
                <span className="text-gray-600">주의 (70-89)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-pink-400 shadow-sm" />
                <span className="text-gray-600">위험 (70미만)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 안전사고 유형 원그래프 */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
          <div className="card p-8 h-full border-0 shadow-lg bg-gradient-to-br from-sky-100 to-cyan-100 flex flex-col min-h-[600px]">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold h-8">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
              안전사고 유형
            </h3>

            <div className="flex items-center justify-center flex-1 min-h-0 py-4">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie 
                    data={incidentTypeData} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false} 
                    outerRadius={130} 
                    fill="#8884d8" 
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {incidentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value: number) => `${value}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {incidentTypeData.map((item, index) => {
                const total = incidentTypeData.reduce((sum, d) => sum + d.value, 0)
                const percentage = ((item.value / total) * 100).toFixed(0)
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700 flex-1 truncate">{item.name}</span>
                    <span className="text-gray-900 px-2 py-0.5 bg-white rounded-lg shadow-sm font-semibold whitespace-nowrap">{item.count}건 ({percentage}%)</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 안전 체크리스트 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="mb-8">
        <div className="card p-6 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <CheckSquare className="w-6 h-6 text-primary-500" />
            <h3 className="text-lg font-semibold">오늘의 안전 체크리스트</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safetyChecklist.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className={`p-5 bg-gradient-to-br ${item.gradient} rounded-2xl border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-1`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{item.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-gray-800 font-semibold">{item.title}</h4>
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                          item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {item.checked && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    <span
                      className={`text-xs px-3 py-1 rounded-full shadow-sm ${
                        item.priority === 'high' ? 'bg-pink-200 text-pink-800' : 'bg-amber-200 text-amber-800'
                      }`}
                    >
                      {item.priority === 'high' ? '높은 우선순위' : '중간 우선순위'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 안전도 추이 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="mb-8">
        <div className="card p-6 border-0 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
              안전도 추이
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriodType('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodType === 'week' ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                주간
              </button>
              <button
                onClick={() => setPeriodType('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodType === 'month' ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                월간
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={currentData}>
              <defs>
                <linearGradient id="safetyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis domain={[0, 100]} stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="안전도"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ fill: '#38bdf8', strokeWidth: 2, r: 5, stroke: '#fff' }}
                activeDot={{ r: 7 }}
                fill="url(#safetyGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  )
}
