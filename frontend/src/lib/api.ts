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

