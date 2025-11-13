import { useState, useEffect } from 'react'
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
  Download,
  Share2,
} from 'lucide-react'
import { getLatestDailyReport, getDailyReport } from '../lib/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function DailyReport() {
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 리포트 데이터 로드
  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 1. 로컬 스토리지에서 리포트 ID 확인
        const reportId = localStorage.getItem('latestReportId')
        
        let data = null
        if (reportId && reportId !== '') {
          try {
            data = await getDailyReport(parseInt(reportId))
            console.log('리포트 조회 성공:', data?.report_id)
          } catch (err: any) {
            console.log('리포트 ID 조회 실패, 최신 리포트 조회 시도...')
            // 최신 리포트 조회
            try {
              data = await getLatestDailyReport()
              if (data?.report_id) {
                localStorage.setItem('latestReportId', data.report_id.toString())
              }
            } catch (latestErr) {
              console.log('최신 리포트도 없음')
            }
          }
        } else {
          // 리포트 ID가 없으면 최신 리포트 조회
          try {
            data = await getLatestDailyReport()
            if (data?.report_id) {
              localStorage.setItem('latestReportId', data.report_id.toString())
            }
          } catch (err) {
            console.log('리포트가 없습니다')
          }
        }
        
        if (data) {
          setReportData(data)
        }
      } catch (err: any) {
        setError(err.message || '리포트를 불러오는 중 오류가 발생했습니다.')
        console.error('리포트 로드 오류:', err)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [])

  // 리포트 날짜 포맷
  const formatReportDate = (dateStr: string) => {
    if (!dateStr) return '날짜 없음'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // 위험 항목 총 개수
  const getTotalRisks = () => {
    if (!reportData?.risk_priorities) return 0
    return reportData.risk_priorities.reduce((sum: number, risk: any) => sum + (risk.count || 1), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">오류: {error}</div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">리포트 데이터가 없습니다</h2>
          <p className="text-gray-600 mb-6">비디오를 분석하여 리포트를 생성해주세요.</p>
          <a href="/camera-setup" className="btn-primary inline-flex items-center gap-2">
            비디오 분석하기
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">일일 리포트</h1>
          <p className="text-gray-600 mt-1">AI가 분석한 오늘의 안전 리포트</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            공유
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            다운로드
          </button>
        </div>
      </div>

      {/* Date */}
      <div className="card">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary-600" />
          <span className="text-lg font-semibold text-gray-900">
            {formatReportDate(reportData.report_date)}
          </span>
        </div>
      </div>

      {/* AI Summary */}
      <div className="card bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-2">AI 한줄평</h2>
            <p className="text-gray-800 leading-relaxed">
              {reportData.overall_summary || 'AI 분석 결과가 없습니다.'}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-medium text-gray-600">총 모니터링 시간</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {reportData.safety_metrics?.total_monitoring_time || "0분"}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-danger" />
            <h3 className="text-sm font-medium text-gray-600">감지된 위험</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{getTotalRisks()}건</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-safe" />
            <h3 className="text-sm font-medium text-gray-600">세이프존 체류율</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {reportData.safety_metrics?.safe_zone_percentage || 0}%
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-medium text-gray-600">활동 지수</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {reportData.safety_metrics?.activity_level || "보통"}
          </p>
        </div>
      </div>

      {/* Risk Priorities */}
      {reportData.risk_priorities && reportData.risk_priorities.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">위험도 우선순위</h2>
          <div className="space-y-3">
            {reportData.risk_priorities.map((risk: any, index: number) => (
              <div key={index} className="border-l-4 border-danger pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    risk.level === 'high' ? 'bg-danger text-white' :
                    risk.level === 'medium' ? 'bg-warning text-white' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {risk.level === 'high' ? '높음' : risk.level === 'medium' ? '중간' : '낮음'}
                  </span>
                  <h3 className="font-semibold text-gray-900">{risk.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{risk.description}</p>
                {risk.location && (
                  <p className="text-xs text-gray-500 mt-1">위치: {risk.location}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Recommendations */}
      {reportData.action_recommendations && reportData.action_recommendations.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">즉시 실행 리스트</h2>
          <div className="space-y-3">
            {reportData.action_recommendations.map((rec: any, index: number) => (
              <div key={index} className="border-l-4 border-primary-600 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.priority === 'high' ? 'bg-danger text-white' :
                    rec.priority === 'medium' ? 'bg-warning text-white' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {rec.priority === 'high' ? '높음' : rec.priority === 'medium' ? '중간' : '낮음'}
                  </span>
                  <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
