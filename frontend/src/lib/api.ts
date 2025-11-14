/**
 * 백엔드 API 클라이언트 - 간단 버전 (비디오 분석만)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface VideoAnalysisResult {
  totalIncidents: number
  falls: number
  dangerousActions: number
  safetyScore: number
  timelineEvents: TimelineEvent[]
  summary: string
  detailedAnalysis?: string
  recommendations: string[]
}

export interface TimelineEvent {
  timestamp: string
  type: 'fall' | 'danger' | 'warning' | 'safe'
  description: string
  severity: 'high' | 'medium' | 'low'
}

/**
 * 비디오 파일을 백엔드로 전송하여 Gemini로 분석합니다.
 */
export async function analyzeVideoWithBackend(file: File): Promise<VideoAnalysisResult> {
  const formData = new FormData()
  formData.append('video', file)

  // 타임아웃 설정 (5분)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)

  try {
    const response = await fetch(`${API_BASE_URL}/api/homecam/analyze-video`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '비디오 분석 중 오류가 발생했습니다.')
    }

    const data = await response.json()
    
    // 백엔드 응답을 프론트엔드 형식으로 변환
    return {
      totalIncidents: data.total_incidents || 0,
      falls: data.falls || 0,
      dangerousActions: data.dangerous_actions || 0,
      safetyScore: data.safety_score || 0,
      timelineEvents: (data.timeline_events || []).map((event: any) => ({
        timestamp: event.timestamp,
        type: event.type,
        description: event.description,
        severity: event.severity,
      })),
      summary: data.summary || '',
      detailedAnalysis: data.detailed_analysis || '',
      recommendations: data.recommendations || [],
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('비디오 분석이 시간 초과되었습니다. 파일 크기를 확인하거나 다시 시도해주세요.')
    }
    throw error
  }
}
