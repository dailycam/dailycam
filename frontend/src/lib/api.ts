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
 * timestamp가 제공되면 타임스탬프를 추가하여 브라우저 캐시를 무효화합니다.
 * timestamp가 없으면 기존 스트림을 계속 사용합니다.
 * video_path가 제공되면 정확한 파일 경로를 사용합니다.
 */
export function getStreamUrl(
  cameraId: string,
  loop: boolean = true,
  speed: number = 1.0,
  timestamp?: number,
  videoPath?: string
): string {
  let baseUrl = `${API_BASE_URL}/api/live-monitoring/stream/${cameraId}?loop=${loop}&speed=${speed}`
  
  // timestamp가 제공된 경우에만 추가 (새 스트림 시작 시)
  if (timestamp !== undefined) {
    baseUrl += `&t=${timestamp}`
  }
  
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
 * 비디오 분석 결과를 기반으로 일일 리포트를 생성합니다. (새로 작성)
 */
export async function generateDailyReportFromAnalysis(
  analysisData: VideoAnalysisResult
): Promise<any> {
  console.log('[API] 리포트 생성 시작')

  // 백엔드 형식으로 변환
  const requestData: any = {
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
  }

  // video_path가 있으면 포함
  if (analysisData.videoPath) {
    requestData.video_path = analysisData.videoPath
  }

  const response = await fetch(`${API_BASE_URL}/api/daily-report/generate`, {
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
    throw new Error(error.detail || error.message || '리포트 생성 중 오류가 발생했습니다.')
  }

  const result = await response.json()
  console.log('[API] 리포트 생성 성공:', result.report_id)
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

// ============================================================
// Analytics API
// ============================================================

export interface WeeklyTrendItem {
  date: string
  safety: number
  incidents: number
  activity: number
}

export interface IncidentDistItem {
  name: string
  value: number
  color: string
}

export interface AnalyticsSummary {
  avg_safety_score: number
  total_incidents: number
  safe_zone_percentage: number
  incident_reduction_percentage: number
  
  // 비교 데이터
  prev_avg_safety?: number
  prev_total_incidents?: number
  safety_change?: number
  safety_change_percent?: number
  incident_change?: number
  incident_change_percent?: number
}

export interface AnalyticsData {
  weekly_trend: WeeklyTrendItem[]
  incident_distribution: IncidentDistItem[]
  summary: AnalyticsSummary
}

/**
 * Analytics 데이터 전체 조회 (데이터베이스에서)
 */
export async function fetchAnalyticsData(): Promise<AnalyticsData> {
  const response = await fetch(`${API_BASE_URL}/api/analytics/all`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Analytics 데이터를 가져오는 중 오류가 발생했습니다.')
  }

  return await response.json()
}

export interface WeeklyTrendItem {
  day: string
  score: number
  incidents: number
}

export interface RiskItem {
  level: 'high' | 'medium' | 'low'
  title: string
  time: string
  count: number
}

export interface RecommendationItem {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
}

export interface DashboardData {
  summary: string
  rangeDays: number
  safetyScore: number
  incidentCount: number
  monitoringHours: number
  activityPattern: string
  weeklyTrend: WeeklyTrendItem[]
  risks: RiskItem[]
  recommendations: RecommendationItem[]
}

/**
 * 대시보드 데이터 조회
 * @param rangeDays 조회할 일수 (기본값: 7)
 */
export async function getDashboardData(rangeDays: number = 7): Promise<DashboardData> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range_days: rangeDays,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '대시보드 데이터를 가져오는 중 오류가 발생했습니다.')
  }

  const data = await response.json()
  
  // 백엔드 응답을 프론트엔드 형식으로 변환
  return {
    summary: data.summary,
    rangeDays: data.range_days,
    safetyScore: data.safety_score,
    incidentCount: data.incident_count,
    monitoringHours: data.monitoring_hours,
    activityPattern: data.activity_pattern,
    weeklyTrend: data.weekly_trend || [],
    risks: data.risks || [],
    recommendations: data.recommendations || [],
  }
}