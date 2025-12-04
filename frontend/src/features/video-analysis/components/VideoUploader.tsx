import { Upload, Play, AlertCircle, Shield, AlertTriangle } from 'lucide-react'
import { VideoAnalysisResult } from '../../../lib/api'

interface VideoUploaderProps {
    videoPreviewUrl: string | null
    isAnalyzing: boolean
    analysisResult: VideoAnalysisResult | null
    analysisProgress: number
    analysisError: string | null
    fileInputRef: React.RefObject<HTMLInputElement>
    onVideoSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
    onUploadClick: () => void
    onAnalyze: () => void
    onReset: () => void
}

export const VideoUploader = ({
    videoPreviewUrl,
    isAnalyzing,
    analysisResult,
    analysisProgress,
    analysisError,
    fileInputRef,
    onVideoSelect,
    onUploadClick,
    onAnalyze,
    onReset,
}: VideoUploaderProps) => {

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
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={onVideoSelect}
                className="hidden"
            />

            {!videoPreviewUrl ? (
                <div
                    onClick={onUploadClick}
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

                    <div className="flex gap-2">
                        <button
                            onClick={onAnalyze}
                            disabled={isAnalyzing}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            {isAnalyzing ? '분석 중...' : 'AI 분석 시작'}
                        </button>
                        <button
                            onClick={onReset}
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
    )
}
