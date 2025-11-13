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
  analysisId?: number
  videoId?: number
  videoPath?: string
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
      analysisId: data.analysis_id,
      videoId: data.video_id,
      videoPath: data.video_path,
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('비디오 분석이 시간 초과되었습니다. 파일 크기를 확인하거나 다시 시도해주세요.')
    }
    throw error
  }
}

/**
 * 비디오 분석 결과를 기반으로 일일 리포트를 생성합니다.
 */
export async function generateDailyReportFromAnalysis(
  analysisData: VideoAnalysisResult
): Promise<any> {
  if (!analysisData.analysisId) {
    throw new Error('analysisId가 필요합니다.')
  }

  // 백엔드 형식으로 변환
  const requestData = {
    analysis_id: analysisData.analysisId,
    total_incidents: analysisData.totalIncidents,
    falls: analysisData.falls,
    dangerous_actions: analysisData.dangerousActions,
    safety_score: analysisData.safetyScore,
    timeline_events: analysisData.timelineEvents.map((event) => ({
      timestamp: event.timestamp,
      type: event.type,
      description: event.description,
      severity: event.severity,
    })),
    summary: analysisData.summary,
    recommendations: analysisData.recommendations,
    video_path: analysisData.videoPath, // video_path 포함
  }

  console.log('[API] 리포트 생성 요청:', {
    analysis_id: requestData.analysis_id,
    video_path: requestData.video_path,
    timeline_events_count: requestData.timeline_events.length,
  })

  const response = await fetch(`${API_BASE_URL}/api/daily-report/from-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let error
    try {
      error = JSON.parse(errorText)
    } catch {
      error = { detail: errorText || '리포트 생성 중 오류가 발생했습니다.' }
    }
    console.error('[API] 리포트 생성 실패:', {
      status: response.status,
      statusText: response.statusText,
      error,
    })
    throw new Error(error.detail || error.message || '리포트 생성 중 오류가 발생했습니다.')
  }

  const result = await response.json()
  
  // 응답 데이터 상세 로깅
  console.log('[API] 리포트 생성 성공 - 전체 응답:', result)
  console.log('[API] 리포트 생성 성공 - report_id:', result.report_id)
  console.log('[API] 리포트 생성 성공 - analysis_id:', result.analysis_id)
  console.log('[API] 리포트 생성 성공 - 응답 키:', Object.keys(result))
  
  // report_id가 없으면 경고
  if (!result.report_id) {
    console.warn('[API] 경고: report_id가 응답에 없습니다!', result)
  }
  
  return result
}

/**
 * 리포트 ID로 리포트를 조회합니다.
 */
export async function getDailyReport(reportId: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/daily-report/${reportId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    try {
      const error = await response.json()
      throw new Error(error.detail || error.message || '리포트 조회 중 오류가 발생했습니다.')
    } catch (jsonError) {
      throw new Error(`리포트 조회 중 오류가 발생했습니다. (${response.status})`)
    }
  }

  return await response.json()
}

/**
 * 가장 최근 리포트를 조회합니다.
 */
export async function getLatestDailyReport(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/daily-report/latest`, {
    method: 'GET',
  })

  if (!response.ok) {
    // 404나 422는 리포트가 없는 것이므로 그대로 throw
    if (response.status === 404 || response.status === 422) {
      try {
        const error = await response.json()
        throw new Error(error.detail || '리포트를 찾을 수 없습니다.')
      } catch (jsonError) {
        throw new Error('리포트를 찾을 수 없습니다.')
      }
    }
    try {
      const error = await response.json()
      throw new Error(error.detail || error.message || '리포트 조회 중 오류가 발생했습니다.')
    } catch (jsonError) {
      throw new Error(`리포트 조회 중 오류가 발생했습니다. (${response.status})`)
    }
  }

  return await response.json()
}

