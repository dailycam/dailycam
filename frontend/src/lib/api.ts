/**
 * ë°±ì—”??API ?´ë¼?´ì–¸??
 */

import { getAuthHeader } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * ?¼ì´ë¸??¤íŠ¸ë¦¬ë° ê´€??API
 */

export interface UploadVideoResponse {
  camera_id: string
  video_path: string
  filename: string
  message: string
  stream_url: string
}

/**
 * ë¹„ë””???Œì¼???…ë¡œ?œí•˜???¤íŠ¸ë¦¬ë° ì¤€ë¹„ë? ?©ë‹ˆ??
 */
export async function uploadVideoForStreaming(
  cameraId: string,
  videoFile: File
): Promise<UploadVideoResponse> {
  const formData = new FormData()
  formData.append('video', videoFile)

  console.log('ë¹„ë””???…ë¡œ???œì‘:', {
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
        // ?€?„ì•„???¤ì • (5ë¶?
        signal: AbortSignal.timeout(5 * 60 * 1000),
      }
    )

    console.log('?…ë¡œ???‘ë‹µ ?íƒœ:', response.status, response.statusText)

    if (!response.ok) {
      let errorMessage = 'ë¹„ë””???…ë¡œ??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.'
      try {
        const error = await response.json()
        errorMessage = error.detail || error.message || errorMessage
        console.error('?…ë¡œ???¤ë¥˜:', error)
      } catch (e) {
        // JSON ?Œì‹± ?¤íŒ¨ ???ìŠ¤?¸ë¡œ ?½ê¸°
        const text = await response.text()
        console.error('?…ë¡œ???¤ë¥˜ (?ìŠ¤??:', text)
        errorMessage = text || errorMessage
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('?…ë¡œ???±ê³µ:', result)
    return result
  } catch (error: any) {
    console.error('?…ë¡œ???ˆì™¸:', error)
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('?…ë¡œ???œê°„??ì´ˆê³¼?˜ì—ˆ?µë‹ˆ?? ?Œì¼ ?¬ê¸°ë¥??•ì¸?´ì£¼?¸ìš”.')
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('?œë²„???°ê²°?????†ìŠµ?ˆë‹¤. ë°±ì—”???œë²„ê°€ ?¤í–‰ ì¤‘ì¸ì§€ ?•ì¸?´ì£¼?¸ìš”.')
    }
    throw error
  }
}

/**
 * ?¤íŠ¸ë¦?URL???ì„±?©ë‹ˆ??
 * timestampê°€ ?œê³µ?˜ë©´ ?€?„ìŠ¤?¬í”„ë¥?ì¶”ê??˜ì—¬ ë¸Œë¼?°ì? ìºì‹œë¥?ë¬´íš¨?”í•©?ˆë‹¤.
 * timestampê°€ ?†ìœ¼ë©?ê¸°ì¡´ ?¤íŠ¸ë¦¼ì„ ê³„ì† ?¬ìš©?©ë‹ˆ??
 * video_pathê°€ ?œê³µ?˜ë©´ ?•í™•???Œì¼ ê²½ë¡œë¥??¬ìš©?©ë‹ˆ??
 */
export function getStreamUrl(
  cameraId: string,
  loop: boolean = true,
  speed: number = 1.0,
  timestamp?: number,
  videoPath?: string
): string {
  let baseUrl = `${API_BASE_URL}/api/live-monitoring/stream/${cameraId}?loop=${loop}&speed=${speed}`

  // timestampê°€ ?œê³µ??ê²½ìš°?ë§Œ ì¶”ê? (???¤íŠ¸ë¦??œì‘ ??
  if (timestamp !== undefined) {
    baseUrl += `&t=${timestamp}`
  }

  // video_pathê°€ ?œê³µ?˜ë©´ ?•í™•???Œì¼ ê²½ë¡œë¥?ì¿¼ë¦¬ ?Œë¼ë¯¸í„°ë¡?ì¶”ê?
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
 * HLS ?¤íŠ¸ë¦¼ì„ ?œì‘?©ë‹ˆ??
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
    throw new Error(error.detail || 'HLS ?¤íŠ¸ë¦??œì‘ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.')
  }

  return await response.json()
}

/**
 * HLS ?¤íŠ¸ë¦¼ì„ ì¤‘ì??©ë‹ˆ??
 */
export async function stopHlsStream(cameraId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/live-monitoring/stop-hls-stream/${cameraId}`, {
    method: 'POST',
  })

  if (!response.ok) {
    // 404???´ë? ì¤‘ì???ê²ƒìœ¼ë¡?ê°„ì£¼
    if (response.status === 404) return

    const error = await response.json()
    throw new Error(error.detail || 'HLS ?¤íŠ¸ë¦?ì¤‘ì? ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.')
  }
}

/**
 * ?¤íŠ¸ë¦¼ì„ ì¤‘ì??©ë‹ˆ??
 */
export async function stopStream(cameraId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/live-monitoring/stop-stream/${cameraId}`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '?¤íŠ¸ë¦?ì¤‘ì? ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.')
  }
}

export interface StageDetermination {
  detected_stage?: string
  confidence?: string
  evidence?: (string | Record<string, any>)[]
  alternative_stages?: Array<{ stage: string; reason: string }>
}

export interface StageConsistency {
  match_level?: '?„í˜•?? | '?½ê°„ë¹ ë¦„' | '?½ê°„?ë¦¼' | 'ë§ì´?¤ë¦„' | '?ë‹¨ë¶ˆê?'
  evidence?: (string | Record<string, any>)[]
  suggested_stage_for_next_analysis?: string
}

export interface DevelopmentSkill {
  name?: string
  category?: '?€ê·¼ìœ¡?´ë™' | '?Œê·¼?¡ìš´?? | '?¸ì?' | '?¸ì–´' | '?¬íšŒ?•ì„œ'
  present?: boolean
  frequency?: number
  level?: '?†ìŒ' | 'ì´ˆê¸°' | 'ì¤‘ê°„' | '?™ë ¨' | string | Record<string, any>
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
  risk_type?: '?™ìƒ' | 'ì¶©ëŒ' | '?¼ì„' | 'ì§ˆì‹/?¼í‚´' | '?”ìƒ' | 'ê¸°í?' | string
  severity?: '?¬ê³ ' | '?„í—˜' | 'ì£¼ì˜' | 'ê¶Œì¥'
  trigger_behavior?: string
  environment_factor?: string
  has_safety_device?: boolean
  safety_device_type?: string
  comment?: string
}

export interface CriticalEvent {
  event_type?: '?¤ì œ?¬ê³ ' | '?¬ê³ ì§ì „?„í—˜?í™©'
  timestamp_range?: string
  description?: string
  estimated_outcome?: '?°ë??ê??? | 'ê²½ë??œë??ê??? | '?€???•ì„œ?ìŠ¤?¸ë ˆ?? | 'ê¸°í?'
}

export interface IncidentEvent {
  event_id?: string | number
  severity?: '?¬ê³ ' | '?„í—˜' | 'ì£¼ì˜' | 'ê¶Œì¥'
  timestamp_range?: string
  timestamp?: string
  description?: string
  has_safety_device?: boolean
}

export interface IncidentSummaryItem {
  severity: '?¬ê³ ' | '?„í—˜' | 'ì£¼ì˜' | 'ê¶Œì¥'
  occurrences: number
  applied_deduction: number
}

export interface SafetyAnalysis {
  overall_safety_level?: 'ë§¤ìš°??Œ' | '??Œ' | 'ì¤‘ê°„' | '?’ìŒ' | 'ë§¤ìš°?’ìŒ'
  adult_presence?:
  | '??ƒ?™ë°˜'
  | '?ì£¼?™ë°˜'
  | '?œë¬¼ê²Œë™ë°?
  | 'ê±°ì˜?†ìŒ'
  | '?ë‹¨ë¶ˆê?'
  | Record<string, any>
  environment_risks?: EnvironmentRisk[]
  environmental_hazards?: Array<{
    type?: string
    name?: string
    severity?: '³ôÀ½' | 'Áß°£' | '³·À½'
    description?: string
    recommendation?: string
  }>
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
 * ë¹„ë””???Œì¼??ë°±ì—”?œë¡œ ?„ì†¡?˜ì—¬ ë¶„ì„?©ë‹ˆ??
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

  // URL ?Œë¼ë¯¸í„° êµ¬ì„±
  const params = new URLSearchParams()
  if (options?.stage) params.append('stage', options.stage)
  if (options?.ageMonths !== undefined) params.append('age_months', options.ageMonths.toString())
  if (options?.temperature !== undefined) params.append('temperature', options.temperature.toString())
  if (options?.topK !== undefined) params.append('top_k', options.topK.toString())
  if (options?.topP !== undefined) params.append('top_p', options.topP.toString())

  const url = `${API_BASE_URL}/api/homecam/analyze-video${params.toString() ? '?' + params.toString() : ''}`

  // ?¸ì¦ ? í° ê°€?¸ì˜¤ê¸?(ê³µí†µ ? í‹¸ë¦¬í‹° ?¬ìš©)
  const headers: HeadersInit = {
    ...getAuthHeader()
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    // 401 Unauthorized ?ëŸ¬ ì²˜ë¦¬
    if (response.status === 401) {
      const errorText = await response.text()
      let errorMessage = '?¸ì¦???„ìš”?©ë‹ˆ?? ë¡œê·¸?????¤ì‹œ ?œë„?´ì£¼?¸ìš”.'
      try {
        const error = JSON.parse(errorText)
        errorMessage = error.detail || errorMessage
      } catch {
        // JSON ?Œì‹± ?¤íŒ¨ ??ê¸°ë³¸ ë©”ì‹œì§€ ?¬ìš©
      }
      throw new Error(errorMessage)
    }

    // ê¸°í? ?ëŸ¬ ì²˜ë¦¬
    let errorMessage = 'ë¹„ë””??ë¶„ì„ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.'
    try {
      const error = await response.json()
      errorMessage = error.detail || error.message || errorMessage
    } catch {
      // JSON ?Œì‹± ?¤íŒ¨ ???ìŠ¤?¸ë¡œ ?½ê¸°
      const text = await response.text()
      errorMessage = text || errorMessage
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()

  // ë°±ì—”??VLM ?‘ë‹µ???„ë¡ ?¸ì—”???•ì‹?¼ë¡œ ë³€??
  // ë°±ì—”?œëŠ” VLM ë©”í??°ì´??ê¸°ë°˜ ë¶„ì„ ê²°ê³¼ë¥?ë°˜í™˜?©ë‹ˆ??
  const safetyAnalysis = data.safety_analysis || {}
  const incidentEvents = safetyAnalysis.incident_events || []

  // ?¬ê³  ? í˜•ë³?ì¹´ìš´??
  let falls = 0
  let dangerousActions = 0
  const timelineEvents: any[] = []

  incidentEvents.forEach((event: any) => {
    const severity = event.severity || ''

    // ?˜ì–´ì§?ì¹´ìš´??(?¬ê³ ë°œìƒ, ?¬ê³ )
    if (severity === '?¬ê³ ë°œìƒ' || severity === '?¬ê³ ') {
      falls++
    }
    // ?„í—˜ ?‰ë™ ì¹´ìš´??
    else if (severity === '?„í—˜') {
      dangerousActions++
    }

    // ?€?„ë¼???´ë²¤??ë³€??
    let eventType: 'fall' | 'danger' | 'warning' | 'safe' = 'warning'
    let eventSeverity: 'high' | 'medium' | 'low' = 'medium'

    if (severity === '?¬ê³ ë°œìƒ' || severity === '?¬ê³ ') {
      eventType = 'fall'
      eventSeverity = 'high'
    } else if (severity === '?„í—˜') {
      eventType = 'danger'
      eventSeverity = 'high'
    } else if (severity === 'ì£¼ì˜') {
      eventType = 'warning'
      eventSeverity = 'medium'
    } else if (severity === 'ê¶Œì¥') {
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

  // ?”ì•½ ?ì„±
  const summary = safetyAnalysis.overall_safety_level
    ? `?ˆì „?? ${safetyAnalysis.overall_safety_level}. ì´?${totalIncidents}ê±´ì˜ ?´ë²¤?¸ê? ê°ì??˜ì—ˆ?µë‹ˆ??`
    : `ì´?${totalIncidents}ê±´ì˜ ?´ë²¤?¸ê? ê°ì??˜ì—ˆ?µë‹ˆ?? ?ˆì „ ?ìˆ˜: ${safetyScore}??

  // ê¶Œì¥?¬í•­ ì¶”ì¶œ
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

  // ë¹„êµ ?°ì´??
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
 * Analytics ?°ì´???„ì²´ ì¡°íšŒ (?°ì´?°ë² ?´ìŠ¤?ì„œ)
 */
export async function fetchAnalyticsData(): Promise<AnalyticsData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/all`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Analytics ?°ì´?°ë? ê°€?¸ì˜¤??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.')
    }

    return await response.json()
  } catch (error) {
    // ë°±ì—”???°ê²° ?¤íŒ¨ ??ë¹??°ì´??ë°˜í™˜
    console.warn('ë°±ì—”???°ê²° ?¤íŒ¨, ë¹??°ì´??ë°˜í™˜:', error)
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
 * ?€?œë³´???°ì´??ì¡°íšŒ
 * @param rangeDays ì¡°íšŒ???¼ìˆ˜ (ê¸°ë³¸ê°? 7)
 */
export async function getDashboardData(rangeDays: number = 7): Promise<DashboardData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(), // ?¸ì¦ ?¤ë” ì¶”ê?
      },
      body: JSON.stringify({
        range_days: rangeDays,
      }),
    })

    if (!response.ok) {
      // 404 ?ëŸ¬??ë°±ì—”?œì— ?”ë“œ?¬ì¸?¸ê? ?†ëŠ” ê²½ìš°?´ë?ë¡?ì¡°ìš©??ëª??°ì´?°ë¡œ fallback
      if (response.status === 404) {
        throw new Error('DASHBOARD_ENDPOINT_NOT_FOUND')
      }
      throw new Error('?€?œë³´???°ì´?°ë? ê°€?¸ì˜¤??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.')
    }

    const data = await response.json()

    // [?”ë²„ê¹? ë°±ì—”???‘ë‹µ ?•ì¸
    console.log('??[Dashboard API] ë°±ì—”???‘ë‹µ ë°›ìŒ:', data)

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
    console.warn('ë°±ì—”???°ê²° ?¤íŒ¨, ë¹??°ì´??ë°˜í™˜:', error)
    return {
      summary: '?°ì´?°ë? ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.',
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
  ?¸ì–´: number
  ?´ë™: number
  ?¸ì?: number
  ?¬íšŒ?? number
  ?•ì„œ: number
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
 * ë°œë‹¬ ë¦¬í¬???°ì´??ì¡°íšŒ
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
      throw new Error('ë°œë‹¬ ?°ì´?°ë? ê°€?¸ì˜¤??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.')
    }

    const data = await response.json()

    return {
      ageMonths: data.age_months || 0,
      developmentSummary: data.development_summary || '',
      developmentScore: data.development_score || 0,
      developmentRadarScores: data.development_radar_scores || {
        ?¸ì–´: 0,
        ?´ë™: 0,
        ?¸ì?: 0,
        ?¬íšŒ?? 0,
        ?•ì„œ: 0,
      },
      strongestArea: data.strongest_area || '',
      dailyDevelopmentFrequency: data.daily_development_frequency || [],
      recommendedActivities: data.recommended_activities || [],
      developmentInsights: data.development_insights || [],
    }
  } catch (error) {
    console.warn('ë°±ì—”???°ê²° ?¤íŒ¨, ë¹??°ì´??ë°˜í™˜:', error)
    return {
      ageMonths: 0,
      developmentSummary: '',
      developmentScore: 0,
      developmentRadarScores: {
        ?¸ì–´: 0,
        ?´ë™: 0,
        ?¸ì?: 0,
        ?¬íšŒ?? 0,
        ?•ì„œ: 0,
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
 * ?˜ì´?¼ì´???´ë¦½ ëª©ë¡ ì¡°íšŒ
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
      throw new Error('?´ë¦½ ?°ì´?°ë? ê°€?¸ì˜¤??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.warn('ë°±ì—”???°ê²° ?¤íŒ¨, ëª??°ì´???¬ìš©:', error)
    return {
      clips: [],
      total: 0,
    }
  }
}