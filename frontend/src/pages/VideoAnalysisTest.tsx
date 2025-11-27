import { useState, useRef, useEffect } from 'react'
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

const STORAGE_KEY = 'videoAnalysisState'

export default function VideoAnalysisTest() {
  // 비디오 분석 상태
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [ageMonths, setAgeMonths] = useState<number | undefined>(undefined)

  // AI 파라미터 설정 상태
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [temperature, setTemperature] = useState(0.4)
  const [topK, setTopK] = useState(30)
  const [topP, setTopP] = useState(0.95)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 컴포넌트 마운트 시 localStorage에서 상태 복원
  useEffect(() => {
    const loadSavedState = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const state = JSON.parse(saved)

          if (state.analysisResult) {
            setAnalysisResult(state.analysisResult)
            console.log('[복원됨] 이전 분석 결과가 복원되었습니다.')
          }

          if (state.ageMonths !== undefined) setAgeMonths(state.ageMonths)
          if (state.temperature !== undefined) setTemperature(state.temperature)
          if (state.topK !== undefined) setTopK(state.topK)
          if (state.topP !== undefined) setTopP(state.topP)
          if (state.showAdvancedSettings !== undefined) setShowAdvancedSettings(state.showAdvancedSettings)

          // 비디오 파일 이름만 표시 (참고용)
          if (state.videoFileName) {
            console.log(`[참고] 이전 분석 비디오: ${state.videoFileName}`)
          }
        }
      } catch (error) {
        console.error('상태 복원 실패:', error)
      }
    }

    loadSavedState()
  }, [])

  // 분석 결과 변경 시 localStorage에 저장
  useEffect(() => {
    if (analysisResult) {
      try {
        const state = {
          analysisResult,
          ageMonths,
          temperature,
          topK,
          topP,
          showAdvancedSettings,
          videoFileName: videoFile?.name,
          savedAt: new Date().toISOString(),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        console.log('[저장됨] 분석 결과가 저장되었습니다.')
      } catch (error) {
        console.error('상태 저장 실패:', error)
      }
    }
  }, [analysisResult, ageMonths, temperature, topK, topP, showAdvancedSettings, videoFile])

  // 비디오 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
    }
  }, [videoPreviewUrl])

  // 비디오 파일 선택
  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        setAnalysisError('비디오 파일만 업로드 가능합니다.')
        return
      }

      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }

      setVideoFile(file)
      setAnalysisError(null)
      setAnalysisProgress(0)
      setIsAnalyzing(false)

      const url = URL.createObjectURL(file)
      setVideoPreviewUrl(url)
    }
  }

  // 비디오 분석 시작
  const handleAnalyzeVideo = async () => {
    if (!videoFile) return

    setAnalysisError(null)
    setAnalysisProgress(0)
    setIsAnalyzing(true)

    let progressInterval: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null

    try {
      progressInterval = setInterval(() => {
        setAnalysisProgress(prev => (prev >= 90 ? 90 : prev + 10))
      }, 500)

      timeoutId = setTimeout(() => {
        if (progressInterval) clearInterval(progressInterval)
        setAnalysisError('비디오 분석이 시간 초과되었습니다.')
        setIsAnalyzing(false)
        setAnalysisProgress(0)
      }, 5 * 60 * 1000)

      console.log('[분석 시작] VLM 비디오 분석 API 호출')
      console.log(`[AI 설정] Temp: ${temperature}, TopK: ${topK}, TopP: ${topP}`)

      const result = await analyzeVideoWithBackend(videoFile, {
        ageMonths,
        temperature,
        topK,
        topP,
      })

      if (timeoutId) clearTimeout(timeoutId)
      if (progressInterval) clearInterval(progressInterval)

      setAnalysisProgress(100)
      const cleanResult = JSON.parse(JSON.stringify(result))
      setAnalysisResult(cleanResult)
      console.log('[분석 완료] 비디오 분석 성공:', cleanResult)
    } catch (error: any) {
      console.error('분석 오류:', error)
      setAnalysisError(error.message || '비디오 분석 중 오류가 발생했습니다.')
    } finally {
      if (progressInterval) clearInterval(progressInterval)
      if (timeoutId) clearTimeout(timeoutId)
      setIsAnalyzing(false)
    }
  }

  // 파일 선택 버튼 클릭
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // 초기화
  const handleReset = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }

    setVideoFile(null)
    setVideoPreviewUrl(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    setAnalysisProgress(0)
    setAgeMonths(undefined)
    setTemperature(0.4)
    setTopK(30)
    setTopP(0.95)
    setShowAdvancedSettings(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    localStorage.removeItem(STORAGE_KEY)
    console.log('[초기화] 저장된 상태가 삭제되었습니다.')
  }

  // 헬퍼 함수들
  const getSafetyLevelColor = (level: string) => {
    if (level === '매우높음' || level === '높음') return 'text-green-600'
    if (level === '중간') return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSafetyLevelBadge = (level: string) => {
    if (level === '매우높음') return { text: '매우 안전', color: 'bg-green-100 text-green-700' }
    if (level === '높음') return { text: '안전', color: 'bg-green-100 text-green-700' }
    if (level === '중간') return { text: '주의', color: 'bg-yellow-100 text-yellow-700' }
    if (level === '낮음') return { text: '위험', color: 'bg-red-100 text-red-700' }
    return { text: '매우 위험', color: 'bg-red-100 text-red-700' }
  }

  const getSafetyScoreColor = (score?: number) => {
    if (score === undefined || score === null) return 'text-gray-100'
    if (score >= 90) return 'text-green-300'
    if (score >= 70) return 'text-green-200'
    if (score >= 50) return 'text-yellow-200'
    return 'text-red-300'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 비디오 분석</h1>
          <p className="text-gray-600 mt-1">Gemini 2.5 Flash로 비디오를 분석하여 안전 정보를 확인하세요</p>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="relative max-h-[600px] overflow-hidden rounded-lg bg-gray-900 flex items-center justify-center">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full h-auto max-h-[600px] rounded-lg"
                    style={{ maxHeight: '600px', objectFit: 'contain' }}
                  />

                  {!isAnalyzing && analysisResult && (
                    <div className="absolute top-4 left-4 right-4 space-y-2">
                      {(analysisResult.safety_analysis?.overall_safety_level ||
                        typeof analysisResult.safety_analysis?.safety_score === 'number') && (
                          <div className="bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-5 h-5" />
                                  <span className="text-sm font-medium">안전도</span>
                                </div>
                                {typeof analysisResult.safety_analysis.safety_score === 'number' && (
                                  <span className={`text-xs font-semibold ${getSafetyScoreColor(analysisResult.safety_analysis.safety_score)}`}>
                                    안전 점수: {analysisResult.safety_analysis.safety_score} / 100
                                  </span>
                                )}
                              </div>
                              {analysisResult.safety_analysis?.overall_safety_level && (
                                <div className="flex items-center gap-2">
                                  <span className={`text-lg font-bold ${getSafetyLevelColor(analysisResult.safety_analysis.overall_safety_level)}`}>
                                    {analysisResult.safety_analysis.overall_safety_level}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSafetyLevelBadge(analysisResult.safety_analysis.overall_safety_level).color}`}>
                                    {getSafetyLevelBadge(analysisResult.safety_analysis.overall_safety_level).text}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}                      {((analysisResult.safety_analysis?.environment_risks &&
                          analysisResult.safety_analysis.environment_risks.length > 0) ||
                          (analysisResult.safety_analysis?.critical_events &&
                            analysisResult.safety_analysis.critical_events.length > 0) ||
                          (analysisResult.safety_analysis?.incident_events &&
                            analysisResult.safety_analysis.incident_events.length > 0)) && (
                            <div className="bg-red-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                              <div className="flex items-center gap-4 text-sm">
                                {analysisResult.safety_analysis?.environment_risks &&
                                  analysisResult.safety_analysis.environment_risks.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <AlertTriangle className="w-4 h-4" />
                                      <span>환경 위험: {analysisResult.safety_analysis.environment_risks.length}건</span>
                                    </div>
                                  )}
                                {analysisResult.safety_analysis?.critical_events &&
                                  analysisResult.safety_analysis.critical_events.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span>중요 사건: {analysisResult.safety_analysis.critical_events.length}건</span>
                                    </div>
                                  )}
                                {analysisResult.safety_analysis?.incident_events &&
                                  analysisResult.safety_analysis.incident_events.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span>상세 사건: {analysisResult.safety_analysis.incident_events.length}건</span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    아이의 개월 수 (선택사항)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="36"
                    value={ageMonths || ''}
                    onChange={(e) => setAgeMonths(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="개월 수를 입력하세요"
                    disabled={isAnalyzing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    개월 수를 입력하면 발달 단계 판단에 참고로 사용됩니다.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">고급 설정 (AI 파라미터)</h3>
                    <button
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      {showAdvancedSettings ? '숨기기' : '표시하기'}
                    </button>
                  </div>

                  {showAdvancedSettings && (
                    <div className="space-y-4 pt-2 border-t border-gray-100">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-700">Temperature: {temperature}</label>
                          <span className="text-xs text-gray-500">0.0 ~ 1.0</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-700">Top K: {topK}</label>
                          <span className="text-xs text-gray-500">1 ~ 40</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="40"
                          step="1"
                          value={topK}
                          onChange={(e) => setTopK(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-700">Top P: {topP}</label>
                          <span className="text-xs text-gray-500">0.0 ~ 1.0</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={topP}
                          onChange={(e) => setTopP(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
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

                {isAnalyzing && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-full transition-all duration-300"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 text-center">분석 진행 중... {analysisProgress}%</p>
                  </div>
                )}

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

          <div className="space-y-4">
            {!isAnalyzing && analysisResult ? (
              <div className="h-full space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">분석 결과</h3>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">발달 단계: </span>
                        <span className="font-medium">{analysisResult.meta?.assumed_stage || '알 수 없음'}단계</span>
                      </div>
                      {analysisResult.meta?.age_months && (
                        <div>
                          <span className="text-gray-500">개월 수: </span>
                          <span className="font-medium">{analysisResult.meta.age_months}개월</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      발달 분석 요약
                    </h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {analysisResult.development_analysis?.summary || '분석 요약 정보가 없습니다.'}
                    </p>
                  </div>

                  {analysisResult.safety_analysis && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary-600" />
                        안전 분석
                      </h4>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between gap-4">
                          {typeof analysisResult.safety_analysis.safety_score === 'number' && (
                            <div className="flex items-center gap-2">
                              <Shield className="w-5 h-5 text-primary-600" />
                              <div>
                                <span className="text-xs text-gray-600">안전 점수</span>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-2xl font-bold text-primary-600">
                                    {analysisResult.safety_analysis.safety_score}
                                  </span>
                                  <span className="text-sm text-gray-500">/ 100</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {analysisResult.safety_analysis?.overall_safety_level && (
                            <div>
                              <span className="text-xs text-gray-600">전체 안전도</span>
                              <div>
                                <span className={`px-3 py-1.5 rounded-md text-sm font-semibold ${getSafetyLevelBadge(analysisResult.safety_analysis.overall_safety_level).color}`}>
                                  {analysisResult.safety_analysis.overall_safety_level}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>비디오를 업로드하고 분석을 시작하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}