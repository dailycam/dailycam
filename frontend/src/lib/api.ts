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

export interface DashboardData {
  summary: string
  rangeDays: number
  safetyScore: number
  incidentCount: number
  monitoringHours: number
  activityPattern: string
  weeklyTrend: DashboardWeeklyTrendItem[]
  risks: RiskItem[]
  recommendations: RecommendationItem[]
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
      },
      body: JSON.stringify({
        range_days: rangeDays,
      }),
    })

    if (!response.ok) {
      throw new Error('대시보드 데이터를 가져오는 중 오류가 발생했습니다.')
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
  } catch (error) {
    // 백엔드 연결 실패 시 목 데이터 반환
    console.warn('백엔드 연결 실패, 목 데이터 사용:', error)
    return {
      summary: "오늘 아이는 전반적으로 안전하게 활동했습니다. 거실 세이프존에서 92%의 시간을 보냈으며, 주방 데드존에 3회 접근했습니다.",
      rangeDays: rangeDays,
      safetyScore: 92,
      incidentCount: 2,
      monitoringHours: 14,
      activityPattern: "정상",
      weeklyTrend: [
        { day: "월", score: 90, incidents: 1, activity: 70, safety: 90 },
        { day: "화", score: 92, incidents: 0, activity: 75, safety: 92 },
        { day: "수", score: 88, incidents: 2, activity: 65, safety: 88 },
        { day: "목", score: 94, incidents: 0, activity: 80, safety: 94 },
        { day: "금", score: 91, incidents: 1, activity: 72, safety: 91 },
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