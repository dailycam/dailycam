import { GoogleGenerativeAI } from '@google/generative-ai'

// 환경 변수 가져오기 헬퍼 함수
const getEnvVar = (key: string): string => {
  // @ts-ignore - Vite 환경 변수 접근
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore - Vite 환경 변수 접근
    return import.meta.env[key] || ''
  }
  return ''
}

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenerativeAI(getEnvVar('VITE_GEMINI_API_KEY'))

// 비디오 분석 결과 타입
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

// 비디오 파일을 Base64로 변환
export async function videoToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // data:video/mp4;base64, 부분을 제거
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

// Gemini 2.5 Flash를 사용한 비디오 분석
export async function analyzeVideoWithGemini(file: File): Promise<VideoAnalysisResult> {
  try {
    // API 키 확인
    const apiKey = getEnvVar('VITE_GEMINI_API_KEY')
    console.log('🔑 Gemini API Key 존재 여부:', apiKey ? '✅ 있음' : '❌ 없음')
    
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하고 개발 서버를 재시작하세요.')
    }

    // Gemini 2.0 Flash 모델 사용
    let model
    try {
      // Gemini 2.0 Flash 실험 버전 사용
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      console.log('📹 사용 모델: Gemini 2.5 Flash')
    } catch (error) {
      console.error('모델 로드 실패:', error)
      throw new Error('Gemini 모델을 로드할 수 없습니다.')
    }

    // 비디오를 Base64로 변환
    const base64Data = await videoToBase64(file)

    const prompt = `
당신은 영유아 안전 모니터링 전문가입니다. 이 비디오를 분석하여 다음 사항들을 감지하고 JSON 형식으로 응답해주세요.

**중요: 모든 응답은 반드시 한글로만 작성해주세요. 영어를 절대 사용하지 마세요.**

분석할 항목:
1. 넘어짐 (fall) - 아이가 넘어지거나 균형을 잃는 순간
2. 위험한 행동 (dangerous_action) - 위험한 물건을 만지거나 위험한 장소에 접근
3. 경고 상황 (warning) - 잠재적으로 위험할 수 있는 상황
4. 안전한 활동 (safe) - 정상적이고 안전한 활동

각 이벤트에 대해 타임스탬프와 한글로 구체적인 설명을 제공해주세요.

응답 형식 (모든 설명은 한글로):
{
  "total_incidents": 전체 사건 수(숫자),
  "falls": 넘어짐 횟수(숫자),
  "dangerous_actions": 위험한 행동 횟수(숫자),
  "safety_score": 0부터 100 사이의 안전도 점수(숫자),
  "timeline_events": [
    {
      "timestamp": "00:00:05",
      "type": "fall" 또는 "danger" 또는 "warning" 또는 "safe",
      "description": "한글로 작성된 구체적인 설명",
      "severity": "high" 또는 "medium" 또는 "low"
    }
  ],
  "summary": "한글로 작성된 전체 비디오 요약 (한 줄)",
  "recommendations": ["한글로 작성된 안전 개선 추천 사항들"]
}

예시:

{
  "total_incidents": 3,
  "falls": 1,
  "dangerous_actions": 1,
  "safety_score": 75,
  "timeline_events": [
    {
      "timestamp": "00:00:15",
      "type": "fall",
      "description": "아이가 소파에서 내려오다가 균형을 잃고 넘어졌습니다",
      "severity": "high"
    }
  ],
  "summary": "대체로 안전하나 1회 넘어짐이 감지되었습니다",
  "recommendations": ["소파 주변에 안전 매트를 설치하세요", "아이가 높은 곳에서 내려올 때 보호자가 지켜봐 주세요"]
}
`

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      },
      { text: prompt },
    ])

    const response = await result.response
    const text = response.text()
    console.log('📄 AI 응답 원본:', text.substring(0, 200) + '...')

    // JSON 응답 파싱
    // Gemini가 마크다운 코드 블록으로 감싸서 응답할 수 있으므로 이를 제거
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    console.log('📊 파싱할 JSON:', jsonText.substring(0, 200) + '...')
    const analysisData = JSON.parse(jsonText)

    // 응답 데이터를 우리의 타입으로 변환
    const analysisResult: VideoAnalysisResult = {
      totalIncidents: analysisData.total_incidents || 0,
      falls: analysisData.falls || 0,
      dangerousActions: analysisData.dangerous_actions || 0,
      safetyScore: analysisData.safety_score || 0,
      timelineEvents: (analysisData.timeline_events || []).map((event: any) => ({
        timestamp: event.timestamp,
        type: event.type,
        description: event.description,
        severity: event.severity,
      })),
      summary: analysisData.summary || '분석 완료',
      recommendations: analysisData.recommendations || [],
    }

    console.log('✨ 분석 완료:', analysisResult)
    return analysisResult
  } catch (error: any) {
    console.error('❌ Gemini 비디오 분석 오류:', error)
    console.error('  - 에러 타입:', error?.constructor?.name)
    console.error('  - 에러 메시지:', error?.message)
    
    // 더 구체적인 에러 메시지 제공
    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      throw new Error('❌ API 키가 유효하지 않습니다. https://aistudio.google.com/apikey 에서 Gemini API 키를 확인해주세요.')
    } else if (error?.message?.includes('model not found') || error?.message?.includes('model')) {
      throw new Error('❌ Gemini 모델을 찾을 수 없습니다. 모델 이름을 확인해주세요.')
    } else if (error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('❌ API 할당량을 초과했습니다. 나중에 다시 시도해주세요.')
    } else if (error instanceof SyntaxError) {
      throw new Error('❌ AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.')
    } else if (error?.message?.includes('VITE_GEMINI_API_KEY')) {
      throw error // 이미 명확한 메시지
    }
    
    throw new Error(`비디오 분석 오류: ${error?.message || '알 수 없는 오류'}`)
  }
}

// 실시간 프레임 분석 (이미지 기반)
export async function analyzeFrame(imageBase64: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `
이 이미지를 분석하여 영유아의 안전 상황을 평가해주세요.
- 위험 요소가 있는지
- 아이의 행동이 안전한지
- 주의가 필요한 상황인지

**반드시 한글로만 응답해주세요. 영어를 사용하지 마세요.**
간단하게 한두 문장으로 한글로 설명해주세요.
`

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
      { text: prompt },
    ])

    const response = await result.response
    return response.text()
  } catch (error: any) {
    console.error('❌ Gemini 프레임 분석 오류:', error)
    throw new Error(`프레임 분석 오류: ${error?.message || '알 수 없는 오류'}`)
  }
}

// 비디오 분석 스트리밍 (진행상황 표시용)
export async function* analyzeVideoStreaming(
  file: File
): AsyncGenerator<{ progress: number; message: string }, VideoAnalysisResult, unknown> {
  try {
    yield { progress: 10, message: '비디오 파일 읽는 중...' }

    const base64Data = await videoToBase64(file)

    yield { progress: 30, message: 'AI 모델에 비디오 전송 중...' }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `
당신은 영유아 안전 모니터링 전문가입니다. 이 비디오를 분석하여 다음 사항들을 감지하고 JSON 형식으로 응답해주세요.

**중요: 모든 응답은 반드시 한글로만 작성해주세요. 영어를 절대 사용하지 마세요.**

분석할 항목:
1. 넘어짐 (fall) - 아이가 넘어지거나 균형을 잃는 순간
2. 위험한 행동 (dangerous_action) - 위험한 물건을 만지거나 위험한 장소에 접근
3. 경고 상황 (warning) - 잠재적으로 위험할 수 있는 상황
4. 안전한 활동 (safe) - 정상적이고 안전한 활동

각 이벤트에 대해 타임스탬프와 한글로 구체적인 설명을 제공해주세요.

응답 형식 (모든 설명은 한글로):
{
  "total_incidents": 전체 사건 수(숫자),
  "falls": 넘어짐 횟수(숫자),
  "dangerous_actions": 위험한 행동 횟수(숫자),
  "safety_score": 0부터 100 사이의 안전도 점수(숫자),
  "timeline_events": [
    {
      "timestamp": "00:00:05",
      "type": "fall" 또는 "danger" 또는 "warning" 또는 "safe",
      "description": "한글로 작성된 구체적인 설명",
      "severity": "high" 또는 "medium" 또는 "low"
    }
  ],
  "summary": "한글로 작성된 전체 비디오 요약 (한 줄)",
  "recommendations": ["한글로 작성된 안전 개선 추천 사항들"]
}

예시:
{
  "total_incidents": 3,
  "falls": 1,
  "dangerous_actions": 1,
  "safety_score": 75,
  "timeline_events": [
    {
      "timestamp": "00:00:15",
      "type": "fall",
      "description": "아이가 소파에서 내려오다가 균형을 잃고 넘어졌습니다",
      "severity": "high"
    }
  ],
  "summary": "대체로 안전하나 1회 넘어짐이 감지되었습니다",
  "recommendations": ["소파 주변에 안전 매트를 설치하세요", "아이가 높은 곳에서 내려올 때 보호자가 지켜봐 주세요"]
}
`

    yield { progress: 50, message: 'AI가 비디오 분석 중...' }

    console.log('📤 Gemini API 요청 시작...')
    console.log('  - 파일 타입:', file.type)
    console.log('  - 파일 크기:', (file.size / 1024 / 1024).toFixed(2), 'MB')

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      },
      { text: prompt },
    ])

    console.log('✅ Gemini API 응답 받음')

    yield { progress: 80, message: '분석 결과 처리 중...' }

    const response = await result.response
    const text = response.text()

    // JSON 응답 파싱
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    const analysisData = JSON.parse(jsonText)

    yield { progress: 90, message: '분석 완료!' }

    const analysisResult: VideoAnalysisResult = {
      totalIncidents: analysisData.total_incidents || 0,
      falls: analysisData.falls || 0,
      dangerousActions: analysisData.dangerous_actions || 0,
      safetyScore: analysisData.safety_score || 0,
      timelineEvents: (analysisData.timeline_events || []).map((event: any) => ({
        timestamp: event.timestamp,
        type: event.type,
        description: event.description,
        severity: event.severity,
      })),
      summary: analysisData.summary || '분석 완료',
      recommendations: analysisData.recommendations || [],
    }

    return analysisResult
  } catch (error: any) {
    console.error('❌ Gemini 비디오 분석 스트리밍 오류:', error)
    throw new Error(`비디오 분석 오류: ${error?.message || '알 수 없는 오류'}`)
  }
}

