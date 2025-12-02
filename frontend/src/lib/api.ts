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
    // 백엔드 연결 실패 시 목 데이터 반환
    console.warn('백엔드 연결 실패, 목 데이터 사용:', error)
    return {
      weekly_trend: [
        { date: '2024-11-04', safety: 90, incidents: 1, activity: 70 },
        { date: '2024-11-05', safety: 92, incidents: 0, activity: 75 },
        { date: '2024-11-06', safety: 88, incidents: 2, activity: 65 },
        { date: '2024-11-07', safety: 94, incidents: 0, activity: 80 },
        { date: '2024-11-08', safety: 91, incidents: 1, activity: 72 },
        { date: '2024-11-09', safety: 93, incidents: 0, activity: 78 },
        { date: '2024-11-10', safety: 92, incidents: 0, activity: 73 },
      ],
      incident_distribution: [
        { name: '넘어짐', value: 2, color: '#ef4444' },
        { name: '충돌', value: 1, color: '#f59e0b' },
        { name: '접근', value: 3, color: '#3b82f6' },
        { name: '이탈', value: 0, color: '#8b5cf6' },
        { name: '기타', value: 1, color: '#6b7280' },
      ],
      summary: {
        avg_safety_score: 91.4,
        total_incidents: 4,
        safe_zone_percentage: 92.5,
        incident_reduction_percentage: 15.2,
        prev_avg_safety: 88,
        prev_total_incidents: 6,
        safety_change: 3.4,
        safety_change_percent: 3.9,
        incident_change: -2,
        incident_change_percent: -33.3,
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

    // 백엔드 응답을 프론트엔드 형식으로 변환
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
      timelineEvents: data.timelineEvents || [],  // 타임라인 이벤트 추가
    }
  } catch (error: any) {
    // 백엔드 연결 실패 시 목 데이터 반환
    // 404 에러는 조용히 처리 (백엔드에 엔드포인트가 없는 경우)
    if (error?.message !== 'DASHBOARD_ENDPOINT_NOT_FOUND') {
      console.warn('백엔드 연결 실패, 목 데이터 사용:', error)
    }
    return {
      summary: "오늘 아이는 전반적으로 안전하게 활동했습니다. 거실 세이프존에서 92%의 시간을 보냈으며, 주방 데드존에 3회 접근했습니다.",
      rangeDays: rangeDays,
      safetyScore: 92,
      developmentScore: 88,
      incidentCount: 2,
      monitoringHours: 8.5,
      activityPattern: "블록 쌓기, 낮잠",
      weeklyTrend: [
        { day: "월", score: 88, incidents: 1, activity: 0, safety: 88 },
        { day: "화", score: 90, incidents: 0, activity: 0, safety: 90 },
        { day: "수", score: 85, incidents: 3, activity: 0, safety: 85 },
        { day: "목", score: 92, incidents: 1, activity: 0, safety: 92 },
        { day: "금", score: 89, incidents: 2, activity: 0, safety: 89 },
        { day: "토", score: 93, incidents: 0, activity: 78, safety: 93 },
        { day: "일", score: 92, incidents: 0, activity: 73, safety: 92 },
      ] as DashboardWeeklyTrendItem[],
      risks: [
        {
          level: 'high',
          title: '주방 근처 반복 접근',
          time: '오후 2:15 - 2:45',
          count: 3,
        },
        {
          level: 'medium',
          title: '계단 입구 접근',
          time: '오전 11:30',
          count: 1,
        },
      ],
      recommendations: [
        {
          priority: 'high',
          title: '주방 안전 게이트 설치',
          description: '아이가 주방 데드존에 자주 접근하고 있습니다. 안전 게이트 설치를 권장합니다.',
        },
        {
          priority: 'medium',
          title: '거실 테이블 모서리 보호대 추가',
          description: '충돌 위험이 감지되었습니다. 모서리 보호대를 추가로 설치하세요.',
        },
      ],
    }
  }
}

// ============================================================
// Development Report API
// ============================================================

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
}

/**
 * 발달 리포트 데이터 조회
 */
export async function getDevelopmentData(days: number = 7): Promise<DevelopmentData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/development/summary?days=${days}`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(), // 인증 헤더 추가
      },
    })

    if (!response.ok) {
      throw new Error('발달 데이터를 가져오는 중 오류가 발생했습니다.')
    }

    const data = await response.json()

    // 백엔드 응답을 프론트엔드 형식으로 변환
    return {
      ageMonths: data.age_months || 7,
      developmentSummary: data.development_summary || '아직 분석된 데이터가 없습니다.',
      developmentScore: data.development_score || 0,
      developmentRadarScores: data.development_radar_scores || {
        언어: 0,
        운동: 0,
        인지: 0,
        사회성: 0,
        정서: 0,
      },
      strongestArea: data.strongest_area || '운동',
      dailyDevelopmentFrequency: data.daily_development_frequency || [],
      recommendedActivities: data.recommended_activities || [],
    }
  } catch (error) {
    console.warn('백엔드 연결 실패, 목 데이터 사용:', error)
    // 목 데이터 반환
    return {
      ageMonths: 7,
      developmentSummary: '오늘 아이는 총 79건의 발달 행동이 관찰되었으며, 특히 운동 발달 영역에서 활발한 움직임을 보였습니다.',
      developmentScore: 88,
      developmentRadarScores: {
        언어: 88,
        운동: 92,
        인지: 85,
        사회성: 90,
        정서: 87,
      },
      strongestArea: '운동',
      dailyDevelopmentFrequency: [
        { category: '언어', count: 18, color: '#0284c7' },
        { category: '운동', count: 25, color: '#22c55e' },
        { category: '인지', count: 12, color: '#f59e0b' },
        { category: '사회성', count: 15, color: '#0ea5e9' },
        { category: '정서', count: 9, color: '#06b6d4' },
      ],
      recommendedActivities: [
        {
          title: '까꿍 놀이',
          benefit: '인지 발달',
          description: '대상 영속성 개념을 발달시키는 데 도움이 됩니다.',
          duration: '10-15분',
        },
      ],
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
          ...getAuthHeader(), // 인증 헤더 추가
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
    // 목 데이터 반환
    return {
      clips: [],
      total: 0,
    }
  }
}