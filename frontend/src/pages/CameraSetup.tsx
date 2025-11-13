import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  Plus,
  Wifi,
  MapPin,
  Shield,
  Skull,
  Settings,
  Trash2,
  CheckCircle2,
  Upload,
  Play,
  AlertCircle,
  TrendingDown,
  Activity,
  Clock,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { analyzeVideoWithBackend, VideoAnalysisResult } from '../lib/api'

export default function CameraSetup() {
  const [selectedCamera, setSelectedCamera] = useState<string | null>('camera-1')
  const [zoneMode, setZoneMode] = useState<'safe' | 'dead'>('safe')
  const navigate = useNavigate()
  
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

      // 백엔드 API 호출
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
      
      // 분석 결과를 로컬 스토리지에 저장 (analysisId 포함)
      localStorage.setItem('videoAnalysisResult', JSON.stringify(result))
      
      // 리포트 생성 (자동) - analysisId 없이도 생성 가능
      console.log('[리포트 생성] 시작 (analysisId 없이도 생성 가능)')
      try {
        const { generateDailyReportFromAnalysis } = await import('../lib/api')
        
        // 리포트 생성 타임아웃 (3분)
        const reportPromise = generateDailyReportFromAnalysis(result)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('리포트 생성이 시간 초과되었습니다.')), 3 * 60 * 1000)
        })
        
        const reportData = await Promise.race([reportPromise, timeoutPromise]) as any
        
        console.log('[리포트 생성] 성공:', reportData)
        // 리포트 ID를 로컬 스토리지에 저장
        if (reportData.report_id) {
          localStorage.setItem('latestReportId', reportData.report_id.toString())
          console.log('[리포트 생성] 리포트 ID 저장:', reportData.report_id)
        } else {
          console.warn('[리포트 생성] 리포트 ID가 없습니다:', reportData)
        }
      } catch (error: any) {
        console.error('[리포트 생성] 실패:', error)
        console.error('[리포트 생성] 오류 상세:', error.message || error)
        // 리포트 생성 실패해도 분석 결과는 표시
        setAnalysisError(prev => prev ? prev : '리포트 생성에 실패했지만 분석 결과는 확인할 수 있습니다.')
      }
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">홈캠 연동</h1>
          <p className="text-gray-600 mt-1">카메라를 연결하고 안전 구역을 설정하세요</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          새 카메라 추가
        </button>
      </div>

      {/* Camera List & Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera List */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">연동된 카메라</h2>
          <div className="space-y-3">
            <CameraCard
              id="camera-1"
              name="거실 카메라"
              status="online"
              location="거실"
              isSelected={selectedCamera === 'camera-1'}
              onSelect={() => setSelectedCamera('camera-1')}
            />
            <CameraCard
              id="camera-2"
              name="아이방 카메라"
              status="online"
              location="아이방"
              isSelected={selectedCamera === 'camera-2'}
              onSelect={() => setSelectedCamera('camera-2')}
            />
            <CameraCard
              id="camera-3"
              name="주방 카메라"
              status="offline"
              location="주방"
              isSelected={selectedCamera === 'camera-3'}
              onSelect={() => setSelectedCamera('camera-3')}
            />
          </div>

          {/* Add Camera Button */}
          <button className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            카메라 추가
          </button>
        </div>

        {/* Zone Setup */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">구역 설정</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setZoneMode('safe')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  zoneMode === 'safe'
                    ? 'bg-safe text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                세이프존
              </button>
              <button
                onClick={() => setZoneMode('dead')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  zoneMode === 'dead'
                    ? 'bg-danger text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Skull className="w-4 h-4 inline mr-2" />
                데드존
              </button>
            </div>
          </div>

          {/* Camera Preview with Zone Drawing */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-4">
            {/* Simulated Camera Feed */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="text-sm">카메라 피드 (시뮬레이션)</p>
                <p className="text-xs mt-1">실제 구현 시 WebRTC 또는 HLS 스트림</p>
              </div>
            </div>

            {/* Safe Zone Overlay (Example) */}
            <div className="absolute top-20 left-20 w-64 h-48 border-4 border-safe rounded-lg bg-safe/10">
              <div className="absolute -top-8 left-0 bg-safe text-white text-xs px-2 py-1 rounded">
                세이프존 1
              </div>
            </div>

            {/* Dead Zone Overlay (Example) */}
            <div className="absolute bottom-20 right-20 w-48 h-32 border-4 border-danger rounded-lg bg-danger/10">
              <div className="absolute -top-8 left-0 bg-danger text-white text-xs px-2 py-1 rounded">
                데드존 1 (주방)
              </div>
            </div>

            {/* Drawing Instructions */}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
              💡 화면을 드래그하여 {zoneMode === 'safe' ? '세이프존' : '데드존'}을 그리세요
            </div>
          </div>

          {/* Zone List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">설정된 구역</h3>
            <ZoneItem
              type="safe"
              name="세이프존 1"
              description="거실 중앙 영역"
            />
            <ZoneItem
              type="safe"
              name="세이프존 2"
              description="놀이 공간"
            />
            <ZoneItem
              type="dead"
              name="데드존 1"
              description="주방 입구"
            />
          </div>
        </div>
      </div>

      {/* Video Analysis Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI 비디오 분석 (테스트)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gemini 2.0 Flash (2.5 Flash)로 비디오를 분석하여 넘어짐, 위험 행동 등을 감지합니다
            </p>
          </div>
        </div>

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
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full rounded-lg bg-gray-900"
                />
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

          {/* 분석 완료 상태 */}
          <div className="space-y-4">
            {analysisResult ? (
              <div className="h-full flex items-center justify-center p-12 text-center">
                <div className="w-full">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">분석이 완료되었습니다!</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    비디오 분석이 성공적으로 완료되었습니다.<br />
                    상세한 리포트를 확인하세요.
                  </p>
                  <button
                    onClick={() => navigate('/daily-report')}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    분석 결과 보러가기
                    <ArrowRight className="w-4 h-4" />
                  </button>
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

      {/* Camera Connection Guide */}
      <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">카메라 연동 가이드</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GuideStep
            step={1}
            title="카메라 연결"
            description="기존 홈캠의 RTSP 주소를 입력하거나 Wi-Fi로 연결하세요"
            icon={Wifi}
          />
          <GuideStep
            step={2}
            title="위치 설정"
            description="카메라가 설치된 공간을 지정하세요"
            icon={MapPin}
          />
          <GuideStep
            step={3}
            title="구역 설정"
            description="세이프존과 데드존을 그려서 안전 범위를 정의하세요"
            icon={Shield}
          />
        </div>
      </div>
    </div>
  )
}

// Camera Card Component
function CameraCard({
  id,
  name,
  status,
  location,
  isSelected,
  onSelect,
}: {
  id: string
  name: string
  status: 'online' | 'offline'
  location: string
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Camera className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-500">{location}</p>
          </div>
        </div>
        {status === 'online' && (
          <CheckCircle2 className="w-5 h-5 text-safe" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-safe' : 'bg-gray-400'}`}></div>
          <span className="text-xs text-gray-600">
            {status === 'online' ? '온라인' : '오프라인'}
          </span>
        </div>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-gray-200 rounded">
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-1 hover:bg-danger-50 rounded">
            <Trash2 className="w-4 h-4 text-gray-600 hover:text-danger" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Zone Item Component
function ZoneItem({
  type,
  name,
  description,
}: {
  type: 'safe' | 'dead'
  name: string
  description: string
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {type === 'safe' ? (
          <Shield className="w-5 h-5 text-safe" />
        ) : (
          <Skull className="w-5 h-5 text-danger" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button className="p-1 hover:bg-gray-200 rounded">
        <Trash2 className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  )
}

// Guide Step Component
function GuideStep({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: number
  title: string
  description: string
  icon: any
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
          {step}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

// Timeline Event Card Component
function TimelineEventCard({ event }: { event: any }) {
  const getEventColor = (type: string) => {
    switch (type) {
      case 'fall':
        return 'border-red-200 bg-red-50'
      case 'danger':
        return 'border-orange-200 bg-orange-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'safe':
        return 'border-green-200 bg-green-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'fall':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'danger':
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'safe':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">높음</span>
      case 'medium':
        return <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">보통</span>
      case 'low':
        return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">낮음</span>
      default:
        return null
    }
  }

  return (
    <div className={`p-3 rounded-lg border ${getEventColor(event.type)}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          {getEventIcon(event.type)}
          <span className="text-xs font-mono text-gray-600">{event.timestamp}</span>
        </div>
        {getSeverityBadge(event.severity)}
      </div>
      <p className="text-sm text-gray-800">{event.description}</p>
    </div>
  )
}

