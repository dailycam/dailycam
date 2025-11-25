import OpenAI from 'openai'

// OpenAI 클라이언트 초기화
// 주의: 프로덕션 환경에서는 백엔드에서 API를 호출해야 합니다
export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // 개발 환경에서만 사용
})

// AI 분석 함수들
export async function analyzeVideoFrame(imageBase64: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '이 이미지에서 영유아의 안전 상황을 분석해주세요. 위험 요소가 있다면 구체적으로 설명해주세요.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error('Vision API 오류:', error)
    throw error
  }
}

export async function generateDailySummary(incidents: any[]) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            '당신은 영유아 안전 전문가입니다. 오늘 하루 동안의 안전 데이터를 분석하여 부모님께 한 줄로 요약해주세요.',
        },
        {
          role: 'user',
          content: `오늘의 안전 데이터: ${JSON.stringify(incidents)}`,
        },
      ],
      max_tokens: 200,
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error('Chat API 오류:', error)
    throw error
  }
}

export async function getSafetyRecommendations(riskData: any) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            '당신은 영유아 안전 컨설턴트입니다. 감지된 위험 요소를 바탕으로 구체적이고 실행 가능한 안전 조치를 추천해주세요.',
        },
        {
          role: 'user',
          content: `위험 데이터: ${JSON.stringify(riskData)}`,
        },
      ],
      max_tokens: 500,
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error('Chat API 오류:', error)
    throw error
  }
}

// 스트리밍 분석 (실시간 모니터링용)
export async function* streamAnalysis(prompt: string) {
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        yield content
      }
    }
  } catch (error) {
    console.error('Streaming API 오류:', error)
    throw error
  }
}

