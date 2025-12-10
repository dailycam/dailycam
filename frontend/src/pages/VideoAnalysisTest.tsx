import { useVideoAnalysis } from '../features/video-analysis/hooks/useVideoAnalysis'
import { VideoUploader } from '../features/video-analysis/components/VideoUploader'
import { AnalysisResult } from '../features/video-analysis/components/AnalysisResult'
import { AdvancedSettings } from '../features/video-analysis/components/AdvancedSettings'

export default function CameraSetup() {
  const {
    videoPreviewUrl,
    isAnalyzing,
    analysisProgress,
    analysisError,
    ageMonths,
    setAgeMonths,
    temperature,
    setTemperature,
    topK,
    setTopK,
    topP,
    setTopP,
    fileInputRef,
    handleVideoSelect,
    handleAnalyzeVideo,
    handleUploadClick,
    handleReset,
    analysisResult
  } = useVideoAnalysis()

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
            <VideoUploader
              videoPreviewUrl={videoPreviewUrl}
              isAnalyzing={isAnalyzing}
              analysisResult={analysisResult}
              analysisProgress={analysisProgress}
              analysisError={analysisError}
              fileInputRef={fileInputRef}
              onVideoSelect={handleVideoSelect}
              onUploadClick={handleUploadClick}
              onAnalyze={handleAnalyzeVideo}
              onReset={handleReset}
            />

            {/* 고급 설정 (AI 파라미터 튜닝) */}
            {videoPreviewUrl && (
              <AdvancedSettings
                ageMonths={ageMonths}
                setAgeMonths={setAgeMonths}
                temperature={temperature}
                setTemperature={setTemperature}
                topK={topK}
                setTopK={setTopK}
                topP={topP}
                setTopP={setTopP}
                isAnalyzing={isAnalyzing}
              />
            )}
          </div>

          {/* 분석 결과 상세 표시 (동영상 옆) */}
          <div className="space-y-4">
            {!isAnalyzing && analysisResult && (
              <AnalysisResult analysisResult={analysisResult} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}