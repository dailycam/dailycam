import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Baby,
  Sparkles,
  Download,
  Calendar as CalendarIcon,
  FileVideo,
  ArrowRight,
} from 'lucide-react'
import {
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
  const navigate = useNavigate()
  const [date] = useState<Date>(new Date())
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
          // 상세 정보 가져오기
          const latest = data.items[0]
          const detailResponse = await fetch(`http://localhost:8000/api/analysis/analyses/${latest.id}`)
          const detail = await detailResponse.json()
          setReportData(detail)
        } else {
          setReportData(null)
        }
      } catch (error) {
        console.error('Failed to fetch development report:', error)
        setReportData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [])

  // 데이터 없음 화면
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

  if (!reportData) {
    return (
      <div className="p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Baby className="w-8 h-8 text-primary-600" />
            <h1 className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent text-3xl font-bold">
              발달 리포트
            </h1>
          </div>
          <p className="text-gray-600">AI 분석 기반 영유아 발달 현황을 확인하세요</p>
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
              비디오를 분석하여 아이의 발달 현황 리포트를 생성하세요.
              <br />
              AI가 자동으로 발달 단계, 기술, 행동 패턴을 분석합니다.
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
  const skills = reportData.development?.skills || []
  const summary = reportData.development?.summary || '분석 결과가 없습니다.'
  const detectedStage = reportData.stage?.detected_stage || '알 수 없음'
  const ageMonths = reportData.stage?.age_months || 0

  // 카테고리별 스킬 카운트
  const skillsByCategory: { [key: string]: number } = {}
  skills.forEach((skill: any) => {
    const category = skill.category || '기타'
    skillsByCategory[category] = (skillsByCategory[category] || 0) + 1
  })

  const dailyDevelopmentFrequency = Object.entries(skillsByCategory).map(([category, count]) => ({
    category,
    count,
    color: category === '대근육운동' ? '#22c55e' :
      category === '소근육운동' ? '#3b82f6' :
        category === '언어' ? '#0284c7' :
          category === '인지' ? '#f59e0b' :
            category === '사회정서' ? '#06b6d4' : '#9ca3af'
  }))

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

      {/* AI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="card p-8 bg-gradient-to-br from-primary-50 via-blue-50 to-cyan-50 border-0 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-primary-600" />
              <h2 className="text-primary-900 text-xl font-semibold">AI 발달 분석 요약</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-cyan-50 border-0 shadow-xl h-full">
            <div className="text-center h-full flex flex-col justify-center">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Baby className="w-10 h-10 text-white" />
              </div>
              <p className="text-sm text-gray-600 mb-2">현재 발달 단계</p>
              <p className="text-primary-600 mb-2 text-2xl font-bold">{detectedStage}단계</p>
              <p className="text-sm text-gray-600">개월 수: {ageMonths}개월</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 발달 행동 빈도 차트 */}
      {dailyDevelopmentFrequency.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="card p-8 border-0 shadow-lg mb-8">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-cyan-400 rounded-full" />
              발달 영역별 관찰 빈도
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={dailyDevelopmentFrequency}>
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
                <Bar dataKey="count" name="관찰 횟수" radius={[8, 8, 0, 0]}>
                  {dailyDevelopmentFrequency.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* 관찰된 발달 기술 목록 */}
      {skills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="card p-6 border-0 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">관찰된 발달 기술</h3>
            <div className="space-y-3">
              {skills.map((skill: any, index: number) => (
                <div key={index} className="p-4 bg-gradient-to-r from-primary-50 to-cyan-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{skill.name}</h4>
                    <span className="text-xs px-3 py-1 bg-primary-200 text-primary-700 rounded-full">
                      {skill.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    출현 빈도: {skill.frequency}회 · 숙련도: {skill.level}
                  </p>
                  {skill.examples && skill.examples.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      예시: {skill.examples[0]?.description || skill.examples[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
