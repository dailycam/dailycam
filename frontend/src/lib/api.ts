/**
 * 백엔드 API 클라이언트
 */

import { getAuthHeader } from './auth'

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

export interface StartHlsStreamResponse {
  message: string
  camera_id: string
  status: string
  stream_type: string
  analysis_enabled: boolean
  playlist_url: string
}

/**
 * HLS 스트림을 시작합니다.
 */
export async function startHlsStream(
  cameraId: string,
  enableAnalysis: boolean = true,
  enableRealtimeDetection: boolean = true
): Promise<StartHlsStreamResponse> {
  const params = new URLSearchParams({
    enable_analysis: enableAnalysis.toString(),
    enable_realtime_detection: enableRealtimeDetection.toString(),
  })

  const response = await fetch(
    `${API_BASE_URL}/api/live-monitoring/start-hls-stream/${cameraId}?${params.toString()}`,
    {
      method: 'POST',
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'HLS 스트림 시작 중 오류가 발생했습니다.')
  }

  return await response.json()
}

/**
 * HLS 스트림을 중지합니다.
 */
export async function stopHlsStream(cameraId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/live-monitoring/stop-hls-stream/${cameraId}`, {
    method: 'POST',
  })

  if (!response.ok) {
    // 404는 이미 중지된 것으로 간주
    if (response.status === 404) return

    const error = await response.json()
    throw new Error(error.detail || 'HLS 스트림 중지 중 오류가 발생했습니다.')
  }
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

export interface StageDetermination {
  detected_stage?: string
  confidence?: string
  evidence?: (string | Record<string, any>)[]
  alternative_stages?: Array<{ stage: string; reason: string }>
}

export interface StageConsistency {
  match_level?: '전형적' | '약간빠름' | '약간느림' | '많이다름' | '판단불가'
  evidence?: (string | Record<string, any>)[]
  suggested_stage_for_next_analysis?: string
}

export interface DevelopmentSkill {
  name?: string
  category?: '대근육운동' | '소근육운동' | '인지' | '언어' | '사회정서'
  present?: boolean
  frequency?: number
  level?: '없음' | '초기' | '중간' | '숙련' | string | Record<string, any>
  examples?: string[]
}

export interface NextStageSign {
  name?: string
  present?: boolean
  frequency?: number
  comment?: string
}

export interface DevelopmentAnalysis {
  summary?: string
  skills?: DevelopmentSkill[]
  next_stage_signs?: NextStageSign[]
}

export interface MetaInfo {
  assumed_stage?: '1' | '2' | '3' | '4' | '5' | '6'
  age_months?: number | null
  observation_duration_minutes?: number | null
}

export interface EnvironmentRisk {
  risk_type?: '낙상' | '충돌' | '끼임' | '질식/삼킴' | '화상' | '기타' | string
  severity?: '사고' | '위험' | '주의' | '권장'
  trigger_behavior?: string
  environment_factor?: string
  has_safety_device?: boolean
  safety_device_type?: string
  comment?: string
}

export interface CriticalEvent {
  event_type?: '실제사고' | '사고직전위험상황'
  timestamp_range?: string
  description?: string
  estimated_outcome?: '큰부상가능' | '경미한부상가능' | '놀람/정서적스트레스' | '기타'
}

export interface IncidentEvent {
  event_id?: string | number
  severity?: '사고' | '위험' | '주의' | '권장'
  timestamp_range?: string
  timestamp?: string
  description?: string
  has_safety_device?: boolean
}

export interface IncidentSummaryItem {
  severity: '사고' | '위험' | '주의' | '권장'
  occurrences: number
  applied_deduction: number
}

export interface SafetyAnalysis {
  overall_safety_level?: '매우낮음' | '낮음' | '중간' | '높음' | '매우높음'
  adult_presence?:
  | '항상동반'
  | '자주동반'
  | '드물게동반'
  | '거의없음'
  | '판단불가'
  | Record<string, any>
  environment_risks?: EnvironmentRisk[]
  critical_events?: CriticalEvent[]
  incident_events?: IncidentEvent[]
  incident_summary?: IncidentSummaryItem[]
  safety_score?: number
  recommendations?: (string | { recommendation?: string })[]
}

export interface VideoAnalysisResult {
  totalIncidents: number
  falls: number
  dangerousActions: number
  safetyScore: number
  timelineEvents: TimelineEvent[]
  summary: string
  recommendations: string[]
  meta?: MetaInfo
  stage_consistency?: StageConsistency
  development_analysis?: DevelopmentAnalysis
  safety_analysis?: SafetyAnalysis
  stage_determination?: StageDetermination
  disclaimer?: string
  _extracted_metadata?: Record<string, any>
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
export async function analyzeVideoWithBackend(
  file: File,
  options?: {
    stage?: string
    ageMonths?: number
    temperature?: number
    topK?: number
    topP?: number
  }
): Promise<VideoAnalysisResult> {
  const formData = new FormData()
  formData.append('video', file)

  // URL 파라미터 구성
  const params = new URLSearchParams()
  if (options?.stage) params.append('stage', options.stage)
  if (options?.ageMonths !== undefined) params.append('age_months', options.ageMonths.toString())
  if (options?.temperature !== undefined) params.append('temperature', options.temperature.toString())
  if (options?.topK !== undefined) params.append('top_k', options.topK.toString())
  if (options?.topP !== undefined) params.append('top_p', options.topP.toString())

  const url = `${API_BASE_URL}/api/homecam/analyze-video${params.toString() ? '?' + params.toString() : ''}`

  // 인증 토큰 가져오기 (공통 유틸리티 사용)
  const headers: HeadersInit = {
    ...getAuthHeader()
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    // 401 Unauthorized 에러 처리
    if (response.status === 401) {
      const errorText = await response.text()
      let errorMessage = '인증이 필요합니다. 로그인 후 다시 시도해주세요.'
      try {
        const error = JSON.parse(errorText)
        errorMessage = error.detail || errorMessage
      } catch {
        // JSON 파싱 실패 시 기본 메시지 사용
      }
      throw new Error(errorMessage)
    }

    // 기타 에러 처리
    let errorMessage = '비디오 분석 중 오류가 발생했습니다.'
    try {
      const error = await response.json()
      errorMessage = error.detail || error.message || errorMessage
    } catch {
      // JSON 파싱 실패 시 텍스트로 읽기
      const text = await response.text()
      errorMessage = text || errorMessage
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()

  // 백엔드 VLM 응답을 프론트엔드 형식으로 변환
  // 백엔드는 VLM 메타데이터 기반 분석 결과를 반환합니다
  const safetyAnalysis = data.safety_analysis || {}
  const incidentEvents = safetyAnalysis.incident_events || []

  // 사고 유형별 카운트
  let falls = 0
  let dangerousActions = 0
  const timelineEvents: any[] = []

  incidentEvents.forEach((event: any) => {
    const severity = event.severity || ''

    // 넘어짐 카운트 (사고발생, 사고)
    if (severity === '사고발생' || severity === '사고') {
      falls++
    }
    // 위험 행동 카운트
    else if (severity === '위험') {
      dangerousActions++
    }

    // 타임라인 이벤트 변환
    let eventType: 'fall' | 'danger' | 'warning' | 'safe' = 'warning'
    let eventSeverity: 'high' | 'medium' | 'low' = 'medium'

    if (severity === '사고발생' || severity === '사고') {
      eventType = 'fall'
      eventSeverity = 'high'
    } else if (severity === '위험') {
      eventType = 'danger'
      eventSeverity = 'high'
    } else if (severity === '주의') {
      eventType = 'warning'
      eventSeverity = 'medium'
    } else if (severity === '권장') {
      eventType = 'warning'
      eventSeverity = 'low'
    }

    timelineEvents.push({
      timestamp: event.timestamp_range || event.timestamp || '00:00:00',
      type: eventType,
      description: event.description || '',
      severity: eventSeverity,
    })
  })

  const totalIncidents = incidentEvents.length
  const safetyScore = safetyAnalysis.safety_score || 100

  // 요약 생성
  const summary = safetyAnalysis.overall_safety_level
    ? `안전도: ${safetyAnalysis.overall_safety_level}. 총 ${totalIncidents}건의 이벤트가 감지되었습니다.`
    : `총 ${totalIncidents}건의 이벤트가 감지되었습니다. 안전 점수: ${safetyScore}점`

  // 권장사항 추출
  const recommendations: string[] = []
  if (safetyAnalysis.recommendations && Array.isArray(safetyAnalysis.recommendations)) {
    safetyAnalysis.recommendations.forEach((rec: any) => {
      if (typeof rec === 'string') {
        recommendations.push(rec)
      } else if (rec.recommendation) {
        recommendations.push(rec.recommendation)
      }
    })
  }

  return {
    ...data,
    totalIncidents,
    falls,
    dangerousActions,
    safetyScore,
    timelineEvents,
    summary,
    recommendations,
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
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/all`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Analytics 데이터를 가져오는 중 오류가 발생했습니다.')
    }

    return await response.json()
  } catch (error) {
    // 백엔드 연결 실패 시 빈 데이터 반환
    console.warn('백엔드 연결 실패, 빈 데이터 반환:', error)
    return {
      weekly_trend: [],
      incident_distribution: [],
      summary: {
        avg_safety_score: 0,
        total_incidents: 0,
        safe_zone_percentage: 0,
        incident_reduction_percentage: 0,
        prev_avg_safety: 0,
        prev_total_incidents: 0,
        safety_change: 0,
        safety_change_percent: 0,
        incident_change: 0,
        incident_change_percent: 0,
      },
    }
  }
}

export interface DashboardWeeklyTrendItem {
  day: string
  score: number
  incidents: number
  activity: number
  safety: number
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

export interface DashboardTimelineEvent {
  time: string
  hour: number
  type: 'development' | 'safety'
  severity?: 'danger' | 'warning' | 'info'
  title: string
  description: string
  resolved?: boolean
  hasClip: boolean
  category: string
  isSleep?: boolean
  timestamp_range?: string
  thumbnailUrl?: string
  videoUrl?: string
}

export interface HourlyStat {
  hour: number
  safetyScore: number
  developmentScore: number
  eventCount: number
}

export interface DashboardData {
  summary: string
  rangeDays: number
  safetyScore: number
  developmentScore: number
  incidentCount: number
  monitoringHours: number
  activityPattern: string
  weeklyTrend: DashboardWeeklyTrendItem[]
  risks: RiskItem[]
  recommendations: RecommendationItem[]
  timelineEvents?: DashboardTimelineEvent[]
  hourlyStats?: HourlyStat[]
}

/**
 * 대시보드 데이터 조회
 * @param rangeDays 조회할 일수 (기본값: 7)
 */
export async function getDashboardData(rangeDays: number = 7): Promise<DashboardData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(), // 인증 헤더 추가
      },
      body: JSON.stringify({
        range_days: rangeDays,
      }),
    })

    if (!response.ok) {
      // 404 에러는 백엔드에 엔드포인트가 없는 경우이므로 조용히 목 데이터로 fallback
      if (response.status === 404) {
        throw new Error('DASHBOARD_ENDPOINT_NOT_FOUND')
      }
      throw new Error('대시보드 데이터를 가져오는 중 오류가 발생했습니다.')
    }

    const data = await response.json()

    // [디버깅] 백엔드 응답 확인
    console.log('✅ [Dashboard API] 백엔드 응답 받음:', data)

    return {
      summary: data.summary,
      rangeDays: data.rangeDays || rangeDays,
      safetyScore: data.safetyScore || 0,
      developmentScore: data.developmentScore || 0,
      incidentCount: data.incidentCount || 0,
      monitoringHours: data.monitoringHours || 0,
      activityPattern: data.activityPattern || "",
      weeklyTrend: data.weeklyTrend || [],
      risks: data.risks || [],
      recommendations: data.recommendations || [],
      timelineEvents: data.timelineEvents || [],
      hourlyStats: data.hourlyStats || [],
    }
  } catch (error) {
    console.warn('백엔드 연결 실패, 빈 데이터 반환:', error)
    return {
      summary: '데이터를 불러올 수 없습니다.',
      rangeDays: rangeDays,
      safetyScore: 0,
      developmentScore: 0,
      incidentCount: 0,
      monitoringHours: 0,
      activityPattern: '',
      weeklyTrend: [],
      risks: [],
      recommendations: [],
      timelineEvents: [],
      hourlyStats: [],
    }
  }
}

export interface DevelopmentRadarScores {
  언어: number
  운동: number
  인지: number
  사회성: number
  정서: number
}

export interface DevelopmentFrequencyItem {
  category: string
  count: number
  color: string
}

export interface RecommendedActivity {
  title: string
  benefit: string
  description?: string
  duration?: string
}

export interface DevelopmentData {
  ageMonths: number
  developmentSummary: string
  developmentScore: number
  developmentRadarScores: DevelopmentRadarScores
  strongestArea: string
  dailyDevelopmentFrequency: DevelopmentFrequencyItem[]
  recommendedActivities: RecommendedActivity[]
  developmentInsights: string[]
}

/**
 * 발달 리포트 데이터 조회
 */
export async function getDevelopmentData(days: number = 7): Promise<DevelopmentData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/development/summary?days=${days}`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error('발달 데이터를 가져오는 중 오류가 발생했습니다.')
    }

    const data = await response.json()

    return {
      ageMonths: data.age_months || 0,
      developmentSummary: data.development_summary || '',
      developmentScore: data.development_score || 0,
      developmentRadarScores: data.development_radar_scores || {
        언어: 0,
        운동: 0,
        인지: 0,
        사회성: 0,
        정서: 0,
      },
      strongestArea: data.strongest_area || '',
      dailyDevelopmentFrequency: data.daily_development_frequency || [],
      recommendedActivities: data.recommended_activities || [],
      developmentInsights: data.development_insights || [],
    }
  } catch (error) {
    console.warn('백엔드 연결 실패, 빈 데이터 반환:', error)
    return {
      ageMonths: 0,
      developmentSummary: '',
      developmentScore: 0,
      developmentRadarScores: {
        언어: 0,
        운동: 0,
        인지: 0,
        사회성: 0,
        정서: 0,
      },
      strongestArea: '',
      dailyDevelopmentFrequency: [],
      recommendedActivities: [],
      developmentInsights: [],
    }
  }
}

// ============================================================
// Clip Highlights API
// ============================================================

export interface HighlightClip {
  id: number
  title: string
  description: string
  video_url: string
  thumbnail_url: string
  category: string
  sub_category?: string
  importance?: string
  duration_seconds?: number
  created_at?: string
}

export interface ClipHighlightsResponse {
  clips: HighlightClip[]
  total: number
}

/**
 * 하이라이트 클립 목록 조회
 */
export async function getClipHighlights(
  category: string = 'all',
  limit: number = 20
): Promise<ClipHighlightsResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/clips/list?category=${category}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          ...getAuthHeader(),
        },
      }
    )

    if (!response.ok) {
      throw new Error('클립 데이터를 가져오는 중 오류가 발생했습니다.')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.warn('백엔드 연결 실패, 목 데이터 사용:', error)
    return {
      clips: [],
      total: 0,
    }
  }
}