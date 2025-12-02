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
import { useAnalysis } from '../context/AnalysisContext'

export default function CameraSetup() {
  // 비디오 분석 상태 (전역 상태로 관리)
  const { analysisResult, setAnalysisResult } = useAnalysis()
  
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [ageMonths, setAgeMonths] = useState<number | undefined>(undefined)

  // AI 파라미터 설정 상태
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [temperature, setTemperature] = useState(0.4)
  const [topK, setTopK] = useState(30)
  const [topP, setTopP] = useState(0.95)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 비디오 미리보기 URL 정리 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
    }
  }, [videoPreviewUrl])

  // 비디오 파일 선택 핸들러
  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 비디오 파일인지 확인
      if (!file.type.startsWith('video/')) {
        setAnalysisError('비디오 파일만 업로드 가능합니다.')
        return
      }

      // 이전 비디오 미리보기 URL 정리
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }

      // 상태 완전히 초기화
      setVideoFile(file)
      setAnalysisError(null)
      setAnalysisResult(null)
      setAnalysisProgress(0)
      setIsAnalyzing(false)

      // 비디오 미리보기 URL 생성
      const url = URL.createObjectURL(file)
      setVideoPreviewUrl(url)
    }
  }

  // 비디오 분석 시작
  const handleAnalyzeVideo = async () => {
    if (!videoFile) return

    // 이전 분석 결과 완전히 정리
    setAnalysisResult(null)
    setAnalysisError(null)
    setAnalysisProgress(0)
    setIsAnalyzing(true)

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

      // 백엔드 API 호출 (VLM 프롬프트 분석)
      console.log('[분석 시작] VLM 비디오 분석 API 호출 (자동 발달 단계 판단)...')
      console.log(`[AI 설정] Temp: ${temperature}, TopK: ${topK}, TopP: ${topP}`)
      const result = await analyzeVideoWithBackend(videoFile, {
        ageMonths,
        temperature,
        topK,
        topP,
      })

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
      // 분석 결과를 깊은 복사하여 설정 (이전 객체 참조 제거)
      try {
        const cleanResult = JSON.parse(JSON.stringify(result))
        setAnalysisResult(cleanResult)
        console.log('[분석 완료] 비디오 분석 성공:', cleanResult)
      } catch (parseError) {
        console.error('[분석 결과 파싱 오류]', parseError)
        setAnalysisResult(result)
      }
    } catch (error: any) {
      console.error('분석 오류:', error)
      setAnalysisError(error.message || '비디오 분석 중 오류가 발생했습니다. 백엔드 서버를 확인해주세요.')
    } finally {
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
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }

    setVideoFile(null)
    setVideoPreviewUrl(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    setAnalysisProgress(0)
    setAgeMonths(undefined)

    // AI 파라미터 초기화
    setTemperature(0.4)
    setTopK(30)
    setTopP(0.95)
    setShowAdvancedSettings(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 안전도 레벨 색상
  const getSafetyLevelColor = (level: string) => {
    if (level === '매우높음' || level === '높음') return 'text-green-600'
    if (level === '중간') return 'text-yellow-600'
    return 'text-red-600'
  }

  // 안전도 레벨 배지
  const getSafetyLevelBadge = (level: string) => {
    if (level === '매우높음') return { text: '매우 안전', color: 'bg-green-100 text-green-700' }
    if (level === '높음') return { text: '안전', color: 'bg-green-100 text-green-700' }
    if (level === '중간') return { text: '주의', color: 'bg-yellow-100 text-yellow-700' }
    if (level === '낮음') return { text: '위험', color: 'bg-red-100 text-red-700' }
    return { text: '매우 위험', color: 'bg-red-100 text-red-700' }
  }

  // 🔹 안전 점수 색상 (점수 기반)
  const getSafetyScoreColor = (score?: number) => {
    if (score === undefined || score === null) return 'text-gray-100'
    if (score >= 90) return 'text-green-300'
    if (score >= 70) return 'text-green-200'
    if (score >= 50) return 'text-yellow-200'
    return 'text-red-300'
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
                <div className="relative max-h-[600px] overflow-hidden rounded-lg bg-gray-900 flex items-center justify-center">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full h-auto max-h-[600px] rounded-lg"
                    style={{ maxHeight: '600px', objectFit: 'contain' }}
                  />

                  {/* 분석 결과 오버레이 (동영상 위에 표시) */}
                  {!isAnalyzing && analysisResult && (
                    <div className="absolute top-4 left-4 right-4 space-y-2">
                      {/* 안전도 레벨 + 점수 */}
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
                                  <span
                                    className={`text-xs font-semibold ${getSafetyScoreColor(
                                      analysisResult.safety_analysis.safety_score
                                    )}`}
                                  >
                                    안전 점수: {analysisResult.safety_analysis.safety_score} / 100
                                  </span>
                                )}
                              </div>
                              {analysisResult.safety_analysis?.overall_safety_level && (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-lg font-bold ${getSafetyLevelColor(
                                      analysisResult.safety_analysis.overall_safety_level
                                    )}`}
                                  >
                                    {analysisResult.safety_analysis.overall_safety_level}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${getSafetyLevelBadge(
                                      analysisResult.safety_analysis.overall_safety_level
                                    ).color
                                      }`}
                                  >
                                    {
                                      getSafetyLevelBadge(
                                        analysisResult.safety_analysis.overall_safety_level
                                      ).text
                                    }
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {/* 위험 통계 */}
                      {((analysisResult.safety_analysis?.environment_risks &&
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
                                    <span>
                                      환경 위험: {analysisResult.safety_analysis.environment_risks.length}건
                                    </span>
                                  </div>
                                )}
                              {analysisResult.safety_analysis?.critical_events &&
                                analysisResult.safety_analysis.critical_events.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span>
                                      중요 사건: {analysisResult.safety_analysis.critical_events.length}건
                                    </span>
                                  </div>
                                )}
                              {analysisResult.safety_analysis?.incident_events &&
                                analysisResult.safety_analysis.incident_events.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span>
                                      상세 사건: {analysisResult.safety_analysis.incident_events.length}건
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* 개월 수 선택 */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    아이의 개월 수 (선택사항)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="36"
                    value={ageMonths || ''}
                    onChange={(e) =>
                      setAgeMonths(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="개월 수를 입력하세요"
                    disabled={isAnalyzing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    개월 수를 입력하면 발달 단계 판단에 참고로 사용됩니다. 입력하지 않으면 영상만으로
                    판단합니다.
                  </p>
                </div>

                {/* 고급 설정 (AI 파라미터 튜닝) */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">고급 설정 (AI 파라미터 튜닝)</h3>
                    <button
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      {showAdvancedSettings ? '숨기기' : '표시하기'}
                    </button>
                  </div>

                  {showAdvancedSettings && (
                    <div className="space-y-4 pt-2 border-t border-gray-100">
                      {/* 프리셋 버튼 */}
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => {
                            setTemperature(0.2)
                            setTopK(10)
                            setTopP(0.7)
                          }}
                          className="flex-1 px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
                        >
                          Set A (보수적)
                          <div className="text-[10px] text-gray-500 font-normal mt-0.5">정확성 중심</div>
                        </button>
                        <button
                          onClick={() => {
                            setTemperature(0.4)
                            setTopK(30)
                            setTopP(0.8)
                          }}
                          className="flex-1 px-3 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                        >
                          Set B (밸런스)
                          <div className="text-[10px] text-blue-500 font-normal mt-0.5">공감+팩트</div>
                        </button>
                        <button
                          onClick={() => {
                            setTemperature(0.8)
                            setTopK(80)
                            setTopP(1.0)
                          }}
                          className="flex-1 px-3 py-2 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors border border-purple-200"
                        >
                          Set C (창의적)
                          <div className="text-[10px] text-purple-500 font-normal mt-0.5">풍부한 표현</div>
                        </button>
                      </div>

                      {/* Temperature */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-700">
                            Temperature (창의성): {temperature}
                          </label>
                          <span className="text-xs text-gray-500">0.0 ~ 1.0</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          낮을수록 사실적이고 일관된 답변, 높을수록 창의적이고 다양한 답변
                        </p>
                      </div>

                      {/* Top K */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-700">
                            Top K (어휘 다양성): {topK}
                          </label>
                          <span className="text-xs text-gray-500">1 ~ 40</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="40"
                          step="1"
                          value={topK}
                          onChange={(e) => setTopK(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          다음 단어 선택 시 고려할 후보군의 크기
                        </p>
                      </div>

                      {/* Top P */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-700">
                            Top P (문장 자연스러움): {topP}
                          </label>
                          <span className="text-xs text-gray-500">0.0 ~ 1.0</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={topP}
                          onChange={(e) => setTopP(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          누적 확률 분포를 기반으로 한 샘플링 (높을수록 자연스러움)
                        </p>
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
            {!isAnalyzing && analysisResult ? (
              <div className="h-full space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">분석 결과</h3>
                </div>

                {/* 분석 결과 상세 */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {/* 메타 정보 */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      <div>
                        <span className="text-gray-500">발달 단계: </span>
                        <span className="font-medium">
                          {analysisResult.meta?.assumed_stage || '알 수 없음'}단계
                        </span>
                      </div>
                      {analysisResult.meta?.age_months && (
                        <div>
                          <span className="text-gray-500">개월 수: </span>
                          <span className="font-medium">
                            {analysisResult.meta?.age_months}개월
                          </span>
                        </div>
                      )}
                    </div>
                    {/* 발달 단계 자동 판단 정보 */}
                    {analysisResult.stage_determination && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-blue-600">
                            자동 판단 정보
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${analysisResult.stage_determination?.confidence === '높음'
                              ? 'bg-green-100 text-green-700'
                              : analysisResult.stage_determination?.confidence === '중간'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            신뢰도: {analysisResult.stage_determination?.confidence || '알 수 없음'}
                          </span>
                        </div>
                        {analysisResult.stage_determination?.evidence &&
                          Array.isArray(analysisResult.stage_determination.evidence) &&
                          analysisResult.stage_determination.evidence.length > 0 && (
                            <div className="text-xs text-gray-600">
                              <p className="font-medium mb-1">판단 근거:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {analysisResult.stage_determination.evidence
                                  .slice(0, 3)
                                  .map((ev: any, idx: number) => (
                                    <li key={idx}>
                                      {typeof ev === 'string' ? (
                                        ev
                                      ) : (
                                        <>
                                          {ev.comment && <span>{ev.comment}</span>}
                                          {!ev.comment && ev.description && (
                                            <span>{ev.description}</span>
                                          )}
                                          {!ev.comment &&
                                            !ev.description && (
                                              <span>{JSON.stringify(ev)}</span>
                                            )}
                                        </>
                                      )}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* 발달 분석 요약 */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      📋 발달 분석 요약
                    </h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium">
                      {analysisResult.development_analysis?.summary ||
                        '분석 요약 정보가 없습니다.'}
                    </p>
                  </div>

                  {/* 다음 단계 징후 */}
                  {analysisResult.development_analysis?.next_stage_signs &&
                    analysisResult.development_analysis.next_stage_signs.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-600" />
                          다음 단계 발달 징후
                        </h4>
                        <div className="space-y-2">
                          {analysisResult.development_analysis.next_stage_signs.map(
                            (sign: any, idx: number) => (
                              <div
                                key={idx}
                                className="bg-blue-50 p-3 rounded border-l-4 border-blue-500"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-blue-900">
                                    {sign.name || '다음 단계 기술'}
                                  </span>
                                  {sign.present && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                                      관찰됨
                                    </span>
                                  )}
                                </div>
                                {sign.comment && (
                                  <p className="text-xs text-gray-700">{sign.comment}</p>
                                )}
                                {sign.frequency && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    빈도: {sign.frequency}회
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* 발달 단계 일치도 */}
                  {analysisResult.stage_consistency && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">발달 단계 일치도</h4>
                      <div className="space-y-2">
                        {analysisResult.stage_consistency?.match_level && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">일치 수준: </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${analysisResult.stage_consistency.match_level === '전형적'
                                ? 'bg-green-100 text-green-700'
                                : analysisResult.stage_consistency.match_level === '약간빠름' ||
                                  analysisResult.stage_consistency.match_level === '약간느림'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                                }`}
                            >
                              {analysisResult.stage_consistency.match_level}
                            </span>
                          </div>
                        )}
                        {analysisResult.stage_consistency?.evidence &&
                          Array.isArray(analysisResult.stage_consistency.evidence) &&
                          analysisResult.stage_consistency.evidence.length > 0 && (
                            <div className="text-sm text-gray-700">
                              <p className="font-medium mb-1">근거:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {analysisResult.stage_consistency.evidence.map(
                                  (ev: any, idx: number) => (
                                    <li key={idx}>
                                      {typeof ev === 'string' ? (
                                        ev
                                      ) : (
                                        <>
                                          {ev.comment && <span>{ev.comment}</span>}
                                          {!ev.comment && ev.description && (
                                            <span>{ev.description}</span>
                                          )}
                                          {!ev.comment &&
                                            !ev.description && (
                                              <span>{JSON.stringify(ev)}</span>
                                            )}
                                        </>
                                      )}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* 안전 분석 */}
                  {analysisResult.safety_analysis && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary-600" />
                        안전 분석
                      </h4>
                      <div className="space-y-3">
                        {/* 🔹 안전 점수 및 레벨 표시 */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center justify-between gap-4">
                            {typeof analysisResult.safety_analysis.safety_score === 'number' && (
                              <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary-600" />
                                <div>
                                  <span className="text-xs text-gray-600">안전 점수</span>
                                  <div className="flex items-baseline gap-2">
                                    <span
                                      className={`text-2xl font-bold ${getSafetyScoreColor(
                                        analysisResult.safety_analysis.safety_score
                                      ).replace('text-', 'text-').replace('100', '700')}`}
                                    >
                                      {analysisResult.safety_analysis.safety_score}
                                    </span>
                                    <span className="text-sm text-gray-500">/ 100</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {analysisResult.safety_analysis?.overall_safety_level && (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="text-xs text-gray-600">전체 안전도</span>
                                  <div>
                                    <span
                                      className={`px-3 py-1.5 rounded-md text-sm font-semibold ${getSafetyLevelBadge(
                                        analysisResult.safety_analysis.overall_safety_level
                                      ).color
                                        }`}
                                    >
                                      {analysisResult.safety_analysis.overall_safety_level}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 🔹 감점 내역 표시 */}
                        {analysisResult.safety_analysis?.incident_summary &&
                          Array.isArray(analysisResult.safety_analysis.incident_summary) &&
                          analysisResult.safety_analysis.incident_summary.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                감점 내역
                              </p>
                              <div className="space-y-2">
                                {analysisResult.safety_analysis.incident_summary
                                  .filter(
                                    (item: any) =>
                                      item.occurrences > 0 || item.applied_deduction < 0
                                  )
                                  .map((item: any, idx: number) => {
                                    const severityLabels: Record<string, string> = {
                                      사고: '사고',
                                      위험: '위험',
                                      주의: '주의',
                                      권장: '권장',
                                    }
                                    const severityColors: Record<string, string> = {
                                      사고: 'bg-red-100 text-red-700 border-red-300',
                                      위험: 'bg-orange-100 text-orange-700 border-orange-300',
                                      주의: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                                      권장: 'bg-blue-100 text-blue-700 border-blue-300',
                                    }
                                    const severity = item.severity || '기타'
                                    const occurrences = item.occurrences || 0
                                    const deduction = item.applied_deduction || 0

                                    return (
                                      <div
                                        key={idx}
                                        className={`flex items-center justify-between p-2 rounded border ${severityColors[severity] ||
                                          'bg-gray-100 text-gray-700 border-gray-300'
                                          }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium">
                                            {severityLabels[severity] || severity}
                                          </span>
                                          {occurrences > 0 && (
                                            <span className="text-xs text-gray-600">
                                              {occurrences}건
                                            </span>
                                          )}
                                        </div>
                                        {deduction < 0 && (
                                          <span className="text-xs font-bold text-red-600">
                                            {deduction}점
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          )}

                        {/* 🔹 상세 사건 목록 표시 */}
                        {analysisResult.safety_analysis?.incident_events &&
                          Array.isArray(analysisResult.safety_analysis.incident_events) &&
                          analysisResult.safety_analysis.incident_events.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                상세 사건 목록 ({analysisResult.safety_analysis.incident_events.length}건)
                              </p>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {analysisResult.safety_analysis.incident_events.map(
                                  (event: any, idx: number) => {
                                    const severityColors: Record<string, string> = {
                                      사고: 'border-red-500 bg-red-50',
                                      위험: 'border-orange-500 bg-orange-50',
                                      주의: 'border-yellow-500 bg-yellow-50',
                                      권장: 'border-blue-500 bg-blue-50',
                                    }
                                    const severity = event.severity || '기타'

                                    return (
                                      <div
                                        key={idx}
                                        className={`p-2 rounded border-l-4 ${severityColors[severity] ||
                                          'border-gray-500 bg-gray-50'
                                          }`}
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            className={`px-2 py-0.5 rounded text-xs font-medium ${severity === '사고'
                                              ? 'bg-red-100 text-red-700'
                                              : severity === '위험'
                                                ? 'bg-orange-100 text-orange-700'
                                                : severity === '주의'
                                                  ? 'bg-yellow-100 text-yellow-700'
                                                  : 'bg-blue-100 text-blue-700'
                                              }`}
                                          >
                                            {severity}
                                          </span>
                                          {event.timestamp_range && (
                                            <span className="text-xs text-gray-600">
                                              {event.timestamp_range}
                                            </span>
                                          )}
                                        </div>
                                        {event.description && (
                                          <p className="text-xs text-gray-700">
                                            {event.description}
                                          </p>
                                        )}
                                        {event.has_safety_device !== undefined && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            안전장치:{' '}
                                            {event.has_safety_device ? '있음' : '없음'}
                                          </p>
                                        )}
                                      </div>
                                    )
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        {analysisResult.safety_analysis?.adult_presence && (
                          <div className="space-y-1">
                            {typeof analysisResult.safety_analysis.adult_presence ===
                              'string' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">보호자 동반: </span>
                                <span className="text-sm font-medium">
                                  {analysisResult.safety_analysis.adult_presence}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">보호자 동반: </span>
                                  <span className="text-sm font-medium">
                                    {(analysisResult.safety_analysis.adult_presence as any)
                                      .present
                                      ? '동반됨'
                                      : '동반 안됨'}
                                  </span>
                                </div>
                                {(analysisResult.safety_analysis.adult_presence as any)
                                  .interaction_type && (
                                    <p className="text-xs text-gray-500">
                                      상호작용:{' '}
                                      {
                                        (analysisResult.safety_analysis.adult_presence as any)
                                          .interaction_type
                                      }
                                    </p>
                                  )}
                                {(analysisResult.safety_analysis.adult_presence as any)
                                  .distance_to_child && (
                                    <p className="text-xs text-gray-500">
                                      거리:{' '}
                                      {
                                        (analysisResult.safety_analysis.adult_presence as any)
                                          .distance_to_child
                                      }
                                    </p>
                                  )}
                                {(analysisResult.safety_analysis.adult_presence as any)
                                  .comment && (
                                    <p className="text-xs text-gray-500">
                                      {
                                        (analysisResult.safety_analysis.adult_presence as any)
                                          .comment
                                      }
                                    </p>
                                  )}
                              </div>
                            )}
                          </div>
                        )}

                        {analysisResult.safety_analysis?.environment_risks &&
                          analysisResult.safety_analysis.environment_risks.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                환경 위험 요소 (
                                {analysisResult.safety_analysis.environment_risks.length}건)
                              </p>
                              <div className="space-y-2">
                                {analysisResult.safety_analysis.environment_risks.map(
                                  (risk: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-gray-50 p-3 rounded border-l-4 border-red-500"
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-red-700">
                                          {risk.risk_type || '위험'}
                                        </span>
                                        {risk.severity && (
                                          <span
                                            className={`px-2 py-0.5 rounded text-xs ${risk.severity === '사고'
                                              ? 'bg-red-100 text-red-700'
                                              : risk.severity === '위험'
                                                ? 'bg-orange-100 text-orange-700'
                                                : risk.severity === '주의'
                                                  ? 'bg-yellow-100 text-yellow-700'
                                                  : 'bg-gray-100 text-gray-700'
                                              }`}
                                          >
                                            {risk.severity}
                                          </span>
                                        )}
                                      </div>
                                      {risk.comment && (
                                        <p className="text-xs text-gray-700">
                                          {risk.comment}
                                        </p>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* 중요 사건 */}
                  {analysisResult.safety_analysis?.critical_events &&
                    analysisResult.safety_analysis.critical_events.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          중요 사건
                        </h4>
                        <div className="space-y-2">
                          {analysisResult.safety_analysis.critical_events.map(
                            (event: any, idx: number) => (
                              <div
                                key={idx}
                                className="text-sm bg-white p-3 rounded border-l-4 border-red-500"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {event.timestamp_range && (
                                    <span className="font-medium text-gray-900">
                                      {event.timestamp_range}
                                    </span>
                                  )}
                                  {event.event_type && (
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-medium ${event.event_type === '실제사고'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-orange-100 text-orange-700'
                                        }`}
                                    >
                                      {event.event_type}
                                    </span>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="text-gray-700 mb-1">{event.description}</p>
                                )}
                                {event.estimated_outcome && (
                                  <p className="text-xs text-gray-500">
                                    예상 결과: {event.estimated_outcome}
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* 발달 기술 */}
                  {analysisResult.development_analysis?.skills &&
                    analysisResult.development_analysis.skills.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">관찰된 발달 기술</h4>
                        <div className="space-y-2">
                          {analysisResult.development_analysis.skills
                            .filter((skill: any) => skill.present !== false)
                            .map((skill: any, idx: number) => (
                              <div key={idx} className="bg-white p-3 rounded border">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">
                                    {skill.name || '발달 기술'}
                                  </span>
                                  {skill.category && (
                                    <span className="text-xs text-gray-500">
                                      {skill.category}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  {skill.frequency !== undefined &&
                                    skill.frequency !== null && (
                                      <span>빈도: {skill.frequency}회</span>
                                    )}
                                  {skill.level && (
                                    <span>
                                      수준:{' '}
                                      {typeof skill.level === 'string'
                                        ? skill.level
                                        : typeof skill.level === 'object' &&
                                          skill.level !== null
                                          ? (skill.level as any).level ||
                                          (skill.level as any).value ||
                                          '알 수 없음'
                                          : '알 수 없음'}
                                    </span>
                                  )}
                                </div>
                                {skill.level &&
                                  typeof skill.level === 'object' &&
                                  skill.level !== null &&
                                  'comment' in skill.level &&
                                  (skill.level as any).comment && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {(skill.level as any).comment}
                                    </p>
                                  )}
                                {skill.examples &&
                                  Array.isArray(skill.examples) &&
                                  skill.examples.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-500">
                                      <p className="font-medium mb-1">예시:</p>
                                      <ul className="list-disc list-inside space-y-1">
                                        {skill.examples
                                          .slice(0, 2)
                                          .map((example: any, exIdx: number) => (
                                            <li key={exIdx}>
                                              {typeof example === 'string'
                                                ? example
                                                : String(example)}
                                            </li>
                                          ))}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* 디스클레이머 */}
                  {analysisResult.disclaimer && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-800">
                        {analysisResult.disclaimer}
                      </p>
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