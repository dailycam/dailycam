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

// 대시보드 데이터 타입
export interface WeeklyTrendData {
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
  weeklyTrend: WeeklyTrendData[]
  risks: RiskItem[]
  recommendations: RecommendationItem[]
}

// 비디오 하이라이트 타입
export interface VideoHighlight {
  id: string
  title: string
  timestamp: string
  duration: string
  location: string
  severity: 'high' | 'medium' | 'low'
  description: string
  aiAnalysis: string
  thumbnailUrl?: string
  videoUrl?: string
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

/**
 * 대시보드 데이터를 가져옵니다.
 */
export async function getDashboardData(rangeDays: number = 7): Promise<DashboardData> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ range_days: rangeDays }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '대시보드 데이터를 불러오는데 실패했습니다.')
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
    weeklyTrend: (data.weekly_trend || []).map((item: any) => ({
      day: item.day,
      score: item.score,
      incidents: item.incidents,
    })),
    risks: data.risks.map((item: any) => ({
      level: item.level,
      title: item.title,
      time: item.time,
      count: item.count,
    })),
    recommendations: data.recommendations.map((item: any) => ({
      priority: item.priority,
      title: item.title,
      description: item.description,
    })),
  }
}

/**
 * 비디오 하이라이트 목록을 가져옵니다.
 */
export async function getVideoHighlights(limit: number = 3): Promise<VideoHighlight[]> {
  const response = await fetch(`${API_BASE_URL}/api/video-highlights/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '비디오 하이라이트를 불러오는데 실패했습니다.')
  }

  const data = await response.json()
  
  // 백엔드 응답을 프론트엔드 형식으로 변환
  return data.highlights.map((item: any) => ({
    id: item.id,
    title: item.title,
    timestamp: item.timestamp,
    duration: item.duration,
    location: item.location,
    severity: item.severity,
    description: item.description,
    aiAnalysis: item.ai_analysis,
    thumbnailUrl: item.thumbnail_url,
    videoUrl: item.video_url,
  }))
}

