import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Shield,
  Eye,
  Sparkles,
  Lightbulb,
  FileVideo,
  ArrowRight,
  Clock,
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
  const navigate = useNavigate()
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        // API 호출 (child_id=1)
        const response = await fetch('http://localhost:8000/api/analysis/analyses?child_id=1&limit=1')
        const data = await response.json()

        if (data.items && data.items.length > 0) {
          const latest = data.items[0]
          const detailResponse = await fetch(`http://localhost:8000/api/analysis/analyses/${latest.id}/safety`)
          const detail = await detailResponse.json()
          setReportData(detail)
        } else {
          setReportData(null)
        }
      } catch (error) {
        console.error('Failed to fetch safety report:', error)
        setReportData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [])

  // 로딩 화면
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">리포트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 데이터 없음 화면
  if (!reportData) {
    return (
      <div className="p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary-600" />
            <h1 className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent text-3xl font-bold">
              안전 리포트
            </h1>
          </div>
          <p className="text-gray-600">AI 분석 기반 영유아 안전 현황을 확인하세요</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center min-h-[500px]"
        >
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary-100 to-cyan-100 rounded-full flex items-center justify-center mb-4">
                <FileVideo className="w-12 h-12 text-primary-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">분석 데이터가 없습니다</h2>
            <p className="text-gray-600 mb-8">
              비디오를 분석하여 아이의 안전 현황 리포트를 생성하세요.
              <br />
              AI가 자동으로 위험 요소, 안전 점수, 권장사항을 분석합니다.
            </p>
            <button
              onClick={() => navigate('/video-analysis-test')}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all"
            >
              <FileVideo className="w-5 h-5" />
              비디오 분석하러 가기
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // 데이터 파싱
  const safetyScore = reportData.safety_score || 0
  const safetyLevel = reportData.overall_safety_level || '알 수 없음'
  const incidents = reportData.incidents || []
  const environmentRisks = reportData.environment_risks || []

  // 사고 유형별 집계
  const incidentTypeCount: { [key: string]: number } = {}
  incidents.forEach((incident: any) => {
    const type = incident.risk_type || '기타'
    incidentTypeCount[type] = (incidentTypeCount[type] || 0) + 1
  })

  const incidentTypeData = Object.entries(incidentTypeCount).map(([name, count], index) => ({
    name,
    value: count,
    count,
    color: ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#7dd3fc', '#c4b5fd'][index % 6]
  }))

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
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/40 via-transparent to-cyan-300/30" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-300/25 rounded-full blur-3xl -ml-48 -mb-48" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* 왼쪽: 안전도 스코어 */}
            <div className="text-center">
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
                      animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - safetyScore / 100) }}
                      transition={{ duration: 2, ease: 'easeOut' }}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Shield className="w-12 h-12 mb-3 opacity-90" />
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.8, delay: 0.6 }}>
                      <span className="block text-5xl font-bold">{safetyScore}</span>
                      <span className="text-lg opacity-90">점</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-6">
                <h2 className="text-white mb-2 text-xl font-semibold">안전도</h2>
                <p className="text-white/90 text-sm">{safetyLevel} · 위험 감지 {incidents.length}건</p>
              </motion.div>
            </div>

            {/* 오른쪽: AI 요약 */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="bg-white/25 backdrop-blur-md rounded-2xl p-6 border border-white/30 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-6 h-6 text-white" />
                <h3 className="text-white font-semibold">AI 안전 분석</h3>
              </div>
              <div className="space-y-3 text-sm text-white leading-relaxed mb-4">
                <p className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span>총 {incidents.length}건의 안전 이벤트가 감지되었습니다. 전반적으로 안전한 환경입니다.</span>
                </p>
                <p className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <span>환경 위험 요소 {environmentRisks.length}개가 식별되었습니다.</span>
                </p>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-white" />
                  <p className="text-xs text-white font-semibold">AI 안전 권장사항</p>
                </div>
                <div className="space-y-1.5 text-xs text-white">
                  <p className="flex items-start gap-1">
                    <span>•</span>
                    <span>계속해서 안전한 환경을 유지해주세요.</span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span>•</span>
                    <span>식별된 위험 요소에 대한 안전 조치를 권장합니다.</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/30">
                <div className="text-center">
                  <p className="text-xs text-white/80 mb-1">안전 이벤트</p>
                  <p className="text-white text-lg font-semibold">{incidents.length}건</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/80 mb-1">환경 위험</p>
                  <p className="text-white text-lg font-semibold">{environmentRisks.length}개</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 안전사고 유형 */}
      {incidentTypeData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
          <div className="card p-8 border-0 shadow-lg bg-gradient-to-br from-sky-100 to-cyan-100 mb-8">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
              안전사고 유형 분포
            </h3>
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
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {incidentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* 감지된 안전 이벤트 목록 */}
      {incidents.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
          <div className="card p-6 border-0 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">감지된 안전 이벤트</h3>
            <div className="space-y-3">
              {incidents.map((incident: any, index: number) => (
                <div key={index} className="p-4 bg-gradient-to-r from-warning-50 to-orange-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{incident.description || '안전 이벤트'}</h4>
                    <span className="text-xs px-3 py-1 bg-warning-200 text-warning-700 rounded-full">
                      {incident.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    유형: {incident.risk_type} · 시간: {incident.timestamp || '알 수 없음'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
