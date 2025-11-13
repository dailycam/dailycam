/**
 * 백엔드 API 클라이언트
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * 라이브 스트리밍 관련 API
 */

export interface UploadVideoResponse {
  camera_id: string
  video_path: string
  filename: string
  message: string
  stream_url: string
}

/**
 * 비디오 파일을 업로드하여 스트리밍 준비를 합니다.
 */
export async function uploadVideoForStreaming(
  cameraId: string,
  videoFile: File
): Promise<UploadVideoResponse> {
  const formData = new FormData()
  formData.append('video', videoFile)

  console.log('비디오 업로드 시작:', {
    cameraId,
    filename: videoFile.name,
    size: videoFile.size,
    type: videoFile.type,
    url: `${API_BASE_URL}/api/live-monitoring/upload-video?camera_id=${cameraId}`,
  })

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/live-monitoring/upload-video?camera_id=${cameraId}`,
      {
        method: 'POST',
        body: formData,
        // 타임아웃 설정 (5분)
        signal: AbortSignal.timeout(5 * 60 * 1000),
      }
    )

    console.log('업로드 응답 상태:', response.status, response.statusText)

    if (!response.ok) {
      let errorMessage = '비디오 업로드 중 오류가 발생했습니다.'
      try {
        const error = await response.json()
        errorMessage = error.detail || error.message || errorMessage
        console.error('업로드 오류:', error)
      } catch (e) {
        // JSON 파싱 실패 시 텍스트로 읽기
        const text = await response.text()
        console.error('업로드 오류 (텍스트):', text)
        errorMessage = text || errorMessage
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('업로드 성공:', result)
    return result
  } catch (error: any) {
    console.error('업로드 예외:', error)
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('업로드 시간이 초과되었습니다. 파일 크기를 확인해주세요.')
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.')
    }
    throw error
  }
}

/**
 * 스트림 URL을 생성합니다.
 * 타임스탬프를 추가하여 브라우저 캐시를 무효화합니다.
 * video_path가 제공되면 정확한 파일 경로를 사용합니다.
 */
export function getStreamUrl(
  cameraId: string,
  loop: boolean = true,
  speed: number = 1.0,
  timestamp?: number,
  videoPath?: string
): string {
  const ts = timestamp || Date.now()
  const baseUrl = `${API_BASE_URL}/api/live-monitoring/stream/${cameraId}?loop=${loop}&speed=${speed}&t=${ts}`
  
  // video_path가 제공되면 정확한 파일 경로를 쿼리 파라미터로 추가
  if (videoPath) {
    return `${baseUrl}&video_path=${encodeURIComponent(videoPath)}`
  }
  
  return baseUrl
}

/**
 * 스트림을 중지합니다.
 */
export async function stopStream(cameraId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/live-monitoring/stop-stream/${cameraId}`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '스트림 중지 중 오류가 발생했습니다.')
  }
}

export interface VideoAnalysisResult {
  totalIncidents: number
  falls: number
  dangerousActions: number
  safetyScore: number
  timelineEvents: TimelineEvent[]
  summary: string
  recommendations: string[]
}

export interface TimelineEvent {
  timestamp: string
  type: 'fall' | 'danger' | 'warning' | 'safe'
  description: string
  severity: 'high' | 'medium' | 'low'
}

/**
 * 비디오 파일을 백엔드로 전송하여 분석합니다.
 */
export async function analyzeVideoWithBackend(file: File): Promise<VideoAnalysisResult> {
  const formData = new FormData()
  formData.append('video', file)

  const response = await fetch(`${API_BASE_URL}/api/homecam/analyze-video`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '비디오 분석 중 오류가 발생했습니다.')
  }

  const data = await response.json()
  
  // 백엔드 응답을 프론트엔드 형식으로 변환
  return {
    totalIncidents: data.total_incidents,
    falls: data.falls,
    dangerousActions: data.dangerous_actions,
    safetyScore: data.safety_score,
    timelineEvents: data.timeline_events.map((event: any) => ({
      timestamp: event.timestamp,
      type: event.type,
      description: event.description,
      severity: event.severity,
    })),
    summary: data.summary,
    recommendations: data.recommendations,
  }
}

