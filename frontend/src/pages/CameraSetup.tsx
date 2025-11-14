import { useState, useRef } from 'react'
import {
  Upload,
  Play,
  AlertCircle,
  CheckCircle2,
  Activity,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { analyzeVideoWithBackend, VideoAnalysisResult } from '../lib/api'

export default function CameraSetup() {
  // 비디오 분석 상태
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 비디오 파일 선택 핸들러
  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 비디오 파일인지 확인
      if (!file.type.startsWith('video/')) {
        setAnalysisError('비디오 파일만 업로드 가능합니다.')
        return
      }

      setVideoFile(file)
      setAnalysisError(null)
      setAnalysisResult(null)

      // 비디오 미리보기 URL 생성
      const url = URL.createObjectURL(file)
      setVideoPreviewUrl(url)
    }
  }

  // 비디오 분석 시작
  const handleAnalyzeVideo = async () => {
    if (!videoFile) return

    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisProgress(0)

    let progressInterval: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null

    try {
      // 진행 상태 시뮬레이션
      progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            return 90
          }
          return prev + 10
        })
      }, 500)

      // 타임아웃 설정 (5분)
      timeoutId = setTimeout(() => {
        if (progressInterval) {
          clearInterval(progressInterval)
        }
        setAnalysisError('비디오 분석이 시간 초과되었습니다. 파일 크기를 확인하거나 다시 시도해주세요.')
        setIsAnalyzing(false)
        setAnalysisProgress(0)
      }, 5 * 60 * 1000) // 5분

      // 백엔드 API 호출 (Gemini 분석만)
      console.log('[분석 시작] 비디오 분석 API 호출...')
      const result = await analyzeVideoWithBackend(videoFile)
      
      // 타임아웃 정리
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      
      setAnalysisProgress(100)
      setAnalysisResult(result)
      console.log('[분석 완료] 비디오 분석 성공:', result)
    } catch (error: any) {
      console.error('분석 오류:', error)
      setAnalysisError(error.message || '비디오 분석 중 오류가 발생했습니다. 백엔드 서버를 확인해주세요.')
    } finally {
      // 정리 작업
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      setIsAnalyzing(false)
    }
  }

  // 파일 선택 버튼 클릭
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // 분석 초기화
  const handleReset = () => {
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    setAnalysisProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 안전도 점수 색상
  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 안전도 점수 배지
  const getSafetyScoreBadge = (score: number) => {
    if (score >= 80) return { text: '안전', color: 'bg-green-100 text-green-700' }
    if (score >= 60) return { text: '주의', color: 'bg-yellow-100 text-yellow-700' }
    return { text: '위험', color: 'bg-red-100 text-red-700' }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 비디오 분석</h1>
          <p className="text-gray-600 mt-1">Gemini 2.5 Flash로 비디오를 분석하여 안전 정보를 확인하세요</p>
        </div>
      </div>

      {/* Video Analysis Section */}
      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 비디오 업로드 & 미리보기 */}
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />

            {!videoPreviewUrl ? (
              <div
                onClick={handleUploadClick}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all"
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-700 font-medium mb-2">비디오 파일 업로드</p>
                <p className="text-sm text-gray-500">클릭하여 비디오 파일을 선택하세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full rounded-lg bg-gray-900"
                  />
                  
                  {/* 분석 결과 오버레이 (동영상 위에 표시) */}
                  {analysisResult && (
                    <div className="absolute top-4 left-4 right-4 space-y-2">
                      {/* 안전도 점수 */}
                      <div className="bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            <span className="text-sm font-medium">안전도 점수</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${getSafetyScoreColor(analysisResult.safetyScore)}`}>
                              {analysisResult.safetyScore}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSafetyScoreBadge(analysisResult.safetyScore).color}`}>
                              {getSafetyScoreBadge(analysisResult.safetyScore).text}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 위험 통계 */}
                      {analysisResult.totalIncidents > 0 && (
                        <div className="bg-red-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              <span>전체 사건: {analysisResult.totalIncidents}건</span>
                            </div>
                            {analysisResult.falls > 0 && (
                              <span>넘어짐: {analysisResult.falls}건</span>
                            )}
                            {analysisResult.dangerousActions > 0 && (
                              <span>위험 행동: {analysisResult.dangerousActions}건</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAnalyzeVideo}
                    disabled={isAnalyzing}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {isAnalyzing ? '분석 중...' : 'AI 분석 시작'}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    초기화
                  </button>
                </div>

                {/* 분석 진행 바 */}
                {isAnalyzing && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary-600 h-full transition-all duration-300"
                        style={{ width: `${analysisProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      분석 진행 중... {analysisProgress}%
                    </p>
                  </div>
                )}

                {/* 에러 메시지 */}
                {analysisError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">분석 오류</p>
                      <p className="text-sm text-red-700 mt-1">{analysisError}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 분석 결과 상세 표시 (동영상 옆) */}
          <div className="space-y-4">
            {analysisResult ? (
              <div className="h-full space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">분석 결과</h3>
                </div>
                
                {/* 분석 결과 상세 */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {/* 간단 요약 */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      📋 요약
                    </h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium">
                      {analysisResult.summary}
                    </p>
                  </div>
                  
                  {/* 전체 분석 내용 */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary-600" />
                      🔍 전체 분석 내용
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {analysisResult.detailedAnalysis || analysisResult.summary || '분석 내용이 없습니다.'}
                      </p>
                    </div>
                  </div>
                  
                  {/* 통계 카드 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded border">
                      <p className="text-xs text-gray-500 mb-1">전체 사건</p>
                      <p className="text-2xl font-bold text-gray-900">{analysisResult.totalIncidents}건</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-xs text-gray-500 mb-1">넘어짐</p>
                      <p className="text-2xl font-bold text-red-600">{analysisResult.falls}건</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-xs text-gray-500 mb-1">위험 행동</p>
                      <p className="text-2xl font-bold text-orange-600">{analysisResult.dangerousActions}건</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-xs text-gray-500 mb-1">안전도 점수</p>
                      <p className={`text-2xl font-bold ${getSafetyScoreColor(analysisResult.safetyScore)}`}>
                        {analysisResult.safetyScore}점
                      </p>
                    </div>
                  </div>
                  
                  {/* 타임라인 이벤트 */}
                  {analysisResult.timelineEvents && analysisResult.timelineEvents.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        타임라인 이벤트
                      </h4>
                      <div className="space-y-2">
                        {analysisResult.timelineEvents.map((event: any, idx: number) => (
                          <div key={idx} className="text-sm bg-white p-3 rounded border-l-4 border-primary-500">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{event.timestamp}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                event.severity === 'high' ? 'bg-red-100 text-red-700' :
                                event.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {event.severity === 'high' ? '높음' : event.severity === 'medium' ? '중간' : '낮음'}
                              </span>
                            </div>
                            <p className="text-gray-700">{event.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 추천 사항 */}
                  {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        추천 사항
                      </h4>
                      <ul className="text-sm text-gray-700 space-y-2 bg-white p-3 rounded border">
                        {analysisResult.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary-600 mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-center">
                <div>
                  <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">분석 결과가 여기에 표시됩니다</p>
                  <p className="text-sm text-gray-400 mt-2">
                    비디오를 업로드하고 분석을 시작하세요
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
