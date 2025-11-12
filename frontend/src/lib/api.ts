/**
 * 백엔드 API 클라이언트
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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

