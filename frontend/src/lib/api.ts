/**
 * 백엔드 API 클라이언트 - VLM 프롬프트 기반 비디오 분석
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ---------- 타입 정의 시작 ----------

export interface VideoAnalysisResult {
  meta?: {
    assumed_stage?: '1' | '2' | '3' | '4' | '5' | '6'
    age_months?: number | null
    observation_duration_minutes?: number | null
  }
  stage_consistency?: {
    match_level?: '전형적' | '약간빠름' | '약간느림' | '많이다름' | '판단불가'
    evidence?: (string | { comment?: string; description?: string; [key: string]: any })[]
    suggested_stage_for_next_analysis?: '1' | '2' | '3' | '4' | '5' | '6' | 'other'
  }
  stage_determination?: {
    detected_stage?: string
    confidence?: string
    evidence?: (string | { comment?: string; description?: string; [key: string]: any })[]
    alternative_stages?: Array<{ stage: string; reason: string }>
  }
  development_analysis?: {
    summary?: string
    skills?: DevelopmentSkill[]
    next_stage_signs?: NextStageSign[]
  }
  // ✅ safety_analysis를 별도 인터페이스로 분리
  safety_analysis?: SafetyAnalysis
  disclaimer?: string
}

export interface DevelopmentSkill {
  name?: string
  category?: '대근육운동' | '소근육운동' | '인지' | '언어' | '사회정서'
  present?: boolean
  frequency?: number
  level?: '없음' | '초기' | '중간' | '숙련'
  examples?: string[]
}

export interface NextStageSign {
  name?: string
  present?: boolean
  frequency?: number
  comment?: string
}

// 👉 프롬프트에서 정의한 한국어 버전으로 변경
export interface EnvironmentRisk {
  risk_type?: '낙상' | '충돌' | '끼임' | '질식/삼킴' | '화상' | '기타'
  severity?: '사고' | '위험' | '주의' | '권장'
  trigger_behavior?: string
  environment_factor?: string
  has_safety_device?: boolean
  safety_device_type?:
    | '모서리보호대'
    | '서랍잠금장치'
    | '문스토퍼'
    | '계단안전문'
    | '미끄럼방지매트'
    | '기타'
    | string
  comment?: string
}

export interface CriticalEvent {
  event_type?: '실제사고' | '사고직전위험상황'
  timestamp_range?: string
  description?: string
  estimated_outcome?: '큰부상가능' | '경미한부상가능' | '놀람/정서적스트레스' | '기타'
}

// 🔹 새로 추가: incident_events / incident_summary / safety_score

export interface IncidentEvent {
  event_id: number
  severity: '사고' | '위험' | '주의' | '권장'
  timestamp_range?: string
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
  adult_presence?: '항상동반' | '자주동반' | '드물게동반' | '거의없음' | '판단불가'
  environment_risks?: EnvironmentRisk[]
  critical_events?: CriticalEvent[]

  // 새 구조
  incident_events?: IncidentEvent[]
  incident_summary?: IncidentSummaryItem[]
  safety_score?: number
}

// ---------- 타입 정의 끝 ----------

/**
 * 비디오 파일을 백엔드로 전송하여 VLM 프롬프트로 분석합니다.
 */
export async function analyzeVideoWithBackend(
  file: File,
  stage?: '1' | '2' | '3' | '4' | '5' | '6',
  ageMonths?: number,
  temperature?: number,
  topK?: number,
  topP?: number
): Promise<VideoAnalysisResult> {
  const formData = new FormData()
  formData.append('video', file)

  const params = new URLSearchParams()
  if (stage !== undefined) {
    params.append('stage', stage)
  }
  if (ageMonths !== undefined) {
    params.append('age_months', ageMonths.toString())
  }
  if (temperature !== undefined) {
    params.append('temperature', temperature.toString())
  }
  if (topK !== undefined) {
    params.append('top_k', topK.toString())
  }
  if (topP !== undefined) {
    params.append('top_p', topP.toString())
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/homecam/analyze-video?${params.toString()}`,
      {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '비디오 분석 중 오류가 발생했습니다.')
    }

    const data = await response.json()
    return data as VideoAnalysisResult
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('비디오 분석이 시간 초과되었습니다. 파일 크기를 확인하거나 다시 시도해주세요.')
    }
    throw error
  }
}
