# 하이라이트 영상 기능 가이드

## 🎬 개요

AI가 위험 상황을 자동으로 감지하고, 해당 순간의 영상을 하이라이트 클립으로 생성하는 기능입니다.

## ✨ 주요 기능

### 1. 자동 하이라이트 생성
- **AI 위험 감지**: 실시간으로 위험 상황 모니터링
- **자동 클립 생성**: 위험 발생 전후 30초 자동 녹화
- **AI 분석 추가**: 상황 설명 및 권장 조치 자동 생성
- **썸네일 생성**: 대표 프레임 자동 추출

### 2. 하이라이트 카드
- **시각적 썸네일**: 영상 미리보기
- **위험도 표시**: 높음/중간/낮음 배지
- **시간/위치 정보**: 발생 시각 및 장소
- **빠른 액션**: 재생, 다운로드, 공유

### 3. 비디오 플레이어
- **전체화면 모달**: 몰입형 재생 경험
- **AI 분석 오버레이**: 실시간 분석 결과 표시
- **위험 구역 표시**: 감지된 영역 시각화
- **재생 컨트롤**: 재생/일시정지, 음소거, 전체화면

## 📦 컴포넌트 구조

### HighlightCard
**위치**: `src/components/VideoHighlights/HighlightCard.tsx`

**Props**:
```typescript
interface HighlightCardProps {
  id: string
  title: string
  timestamp: string          // "오후 2:23"
  duration: string           // "0:32"
  location: string           // "주방 입구"
  severity: 'high' | 'medium' | 'low'
  thumbnailUrl?: string
  description: string
  onPlay: () => void
}
```

**사용 예시**:
```typescript
<HighlightCard
  id="highlight-1"
  title="주방 데드존 접근"
  timestamp="오후 2:23"
  duration="0:32"
  location="주방 입구"
  severity="high"
  description="아이가 주방 가스레인지 근처에 접근했습니다."
  onPlay={() => setSelectedVideo('highlight-1')}
/>
```

### VideoPlayer
**위치**: `src/components/VideoHighlights/VideoPlayer.tsx`

**Props**:
```typescript
interface VideoPlayerProps {
  title: string
  videoUrl?: string
  onClose: () => void
}
```

**사용 예시**:
```typescript
{selectedVideo && (
  <VideoPlayer
    title="주방 데드존 접근"
    videoUrl="/videos/highlight-1.mp4"
    onClose={() => setSelectedVideo(null)}
  />
)}
```

## 🎨 UI/UX 특징

### 하이라이트 카드
1. **호버 효과**: 마우스 오버 시 재생 버튼 표시
2. **위험도 색상**:
   - 높음: 빨간색 (#ef4444)
   - 중간: 주황색 (#f59e0b)
   - 낮음: 회색 (#9ca3af)
3. **정보 표시**: 시간, 위치, 지속시간
4. **빠른 액션**: 재생, 다운로드, 공유 버튼

### 비디오 플레이어
1. **전체화면 모달**: 어두운 배경 (90% 투명도)
2. **AI 분석 오버레이**: 상단에 분석 결과 표시
3. **위험 구역 박스**: 빨간색 테두리로 표시
4. **프로페셔널 컨트롤**: 
   - 진행 바
   - 재생/일시정지
   - 음소거
   - 10초 앞/뒤로
   - 전체화면

## 📍 적용된 페이지

### Dashboard (`/dashboard`)
```typescript
// 오늘의 하이라이트 3개 표시
const todayHighlights = mockVideoHighlights.slice(0, 3)

<div className="card">
  <h2>오늘의 하이라이트 영상</h2>
  <div className="grid grid-cols-3 gap-4">
    {todayHighlights.map(highlight => (
      <HighlightCard {...highlight} />
    ))}
  </div>
</div>
```

### Daily Report (`/daily-report`)
```typescript
// 전체 하이라이트 표시
<div className="card">
  <h2>하이라이트 영상</h2>
  <div className="grid grid-cols-3 gap-4">
    {mockVideoHighlights.map(highlight => (
      <HighlightCard {...highlight} />
    ))}
  </div>
</div>
```

## 🔧 데이터 구조

### VideoHighlight 타입
```typescript
interface VideoHighlight {
  id: string
  title: string
  timestamp: string          // 발생 시각
  duration: string           // 영상 길이
  location: string           // 발생 장소
  severity: 'high' | 'medium' | 'low'
  thumbnailUrl?: string      // 썸네일 URL
  videoUrl?: string          // 비디오 URL
  description: string        // 간단한 설명
  aiAnalysis: string         // AI 분석 결과
}
```

### Mock 데이터 예시
```typescript
export const mockVideoHighlights: VideoHighlight[] = [
  {
    id: 'highlight-1',
    title: '주방 데드존 접근',
    timestamp: '오후 2:23',
    duration: '0:32',
    location: '주방 입구',
    severity: 'high',
    description: '아이가 주방 가스레인지 근처에 접근했습니다.',
    aiAnalysis: '가스레인지 근처에서 약 15초간 머물렀습니다.',
  },
  // ...
]
```

## 🚀 실제 구현 시 고려사항

### 1. 비디오 저장 및 스트리밍
```typescript
// 클라우드 저장 (AWS S3, Google Cloud Storage)
const uploadHighlight = async (videoBlob: Blob) => {
  const formData = new FormData()
  formData.append('video', videoBlob)
  
  const response = await fetch('/api/highlights/upload', {
    method: 'POST',
    body: formData,
  })
  
  return response.json()
}

// HLS 스트리밍
<video src={`${CDN_URL}/highlights/${id}/playlist.m3u8`} />
```

### 2. 자동 하이라이트 생성 로직
```typescript
// 백엔드에서 처리
class HighlightGenerator {
  async generateHighlight(incident: Incident) {
    // 1. 위험 발생 시점 전후 30초 추출
    const startTime = incident.timestamp - 15
    const endTime = incident.timestamp + 15
    
    // 2. 비디오 클립 생성 (FFmpeg)
    const videoClip = await this.extractClip(startTime, endTime)
    
    // 3. 썸네일 생성
    const thumbnail = await this.generateThumbnail(videoClip)
    
    // 4. AI 분석
    const analysis = await this.analyzeWithAI(videoClip)
    
    // 5. 저장
    return await this.saveHighlight({
      videoClip,
      thumbnail,
      analysis,
      incident,
    })
  }
}
```

### 3. OpenAI Vision API 통합
```typescript
import { openai } from './lib/openai'

async function analyzeVideoFrame(frameBase64: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '이 영상에서 아이의 위험 상황을 분석하고, 구체적인 안전 조치를 제안해주세요.',
          },
          {
            type: 'image_url',
            image_url: { url: frameBase64 },
          },
        ],
      },
    ],
  })
  
  return response.choices[0].message.content
}
```

### 4. 실시간 알림 연동
```typescript
// 하이라이트 생성 시 푸시 알림
const sendHighlightNotification = async (highlight: VideoHighlight) => {
  await fetch('/api/notifications/push', {
    method: 'POST',
    body: JSON.stringify({
      title: `⚠️ ${highlight.title}`,
      body: highlight.description,
      data: {
        type: 'highlight',
        highlightId: highlight.id,
        severity: highlight.severity,
      },
    }),
  })
}
```

## 📱 모바일 최적화

### 반응형 그리드
```typescript
// 데스크톱: 3열
// 태블릿: 2열
// 모바일: 1열
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {highlights.map(h => <HighlightCard {...h} />)}
</div>
```

### 터치 제스처
```typescript
// 스와이프로 다음/이전 영상
const handleSwipe = (direction: 'left' | 'right') => {
  if (direction === 'left') {
    // 다음 영상
  } else {
    // 이전 영상
  }
}
```

## 🎯 사용자 시나리오

### 시나리오 1: 실시간 알림
```
1. AI가 위험 상황 감지 (주방 접근)
2. 자동으로 하이라이트 클립 생성 (30초)
3. 부모님께 푸시 알림 전송
4. 부모님이 알림 클릭 → 하이라이트 즉시 재생
5. AI 분석 결과 확인 및 조치 결정
```

### 시나리오 2: 일일 리뷰
```
1. 저녁에 Daily Report 확인
2. 하이라이트 영상 섹션 스크롤
3. 관심 있는 클립 클릭하여 재생
4. 다운로드하여 가족과 공유
5. AI 권장 조치 확인 및 실행
```

### 시나리오 3: 의료 상담
```
1. 소아과 방문 전 하이라이트 다운로드
2. 의사에게 아이의 행동 패턴 영상 제공
3. 구체적인 상황 설명 가능
4. 정확한 진단 및 조언 획득
```

## 🔒 보안 및 개인정보

### 1. 영상 암호화
```typescript
// 저장 시 암호화
const encryptedVideo = await encrypt(videoBlob, userKey)

// 재생 시 복호화
const decryptedVideo = await decrypt(encryptedVideo, userKey)
```

### 2. 접근 제어
```typescript
// 본인만 접근 가능
const canAccessHighlight = (userId: string, highlightId: string) => {
  const highlight = getHighlight(highlightId)
  return highlight.userId === userId
}
```

### 3. 자동 삭제
```typescript
// 30일 후 자동 삭제
const scheduleAutoDeletion = (highlightId: string) => {
  const deleteDate = new Date()
  deleteDate.setDate(deleteDate.getDate() + 30)
  
  scheduleJob(deleteDate, () => {
    deleteHighlight(highlightId)
  })
}
```

## 💡 향후 개선 사항

### 1. AI 기능 강화
- [ ] 음성 인식 (아이 울음 소리 감지)
- [ ] 감정 분석 (아이의 표정 분석)
- [ ] 행동 예측 (위험 행동 사전 감지)

### 2. 편집 기능
- [ ] 클립 길이 조정
- [ ] 슬로우 모션
- [ ] 여러 클립 병합
- [ ] 텍스트/스티커 추가

### 3. 공유 기능
- [ ] 가족 그룹 공유
- [ ] 소셜 미디어 공유
- [ ] 의료진 안전 공유
- [ ] 댓글 및 메모

### 4. 분석 기능
- [ ] 하이라이트 통계
- [ ] 위험 패턴 분석
- [ ] 월간 하이라이트 모음
- [ ] 성장 기록 타임랩스

## 🎬 실제 구현 예시

### FFmpeg를 사용한 클립 생성
```bash
# 30초 클립 추출
ffmpeg -i input.mp4 -ss 00:02:23 -t 00:00:30 -c copy output.mp4

# 썸네일 생성
ffmpeg -i input.mp4 -ss 00:02:23 -vframes 1 thumbnail.jpg

# 해상도 최적화
ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -crf 23 output.mp4
```

### WebRTC를 사용한 실시간 녹화
```typescript
const mediaRecorder = new MediaRecorder(stream)
const chunks: Blob[] = []

mediaRecorder.ondataavailable = (e) => {
  chunks.push(e.data)
}

mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'video/webm' })
  await uploadHighlight(blob)
}

// 위험 감지 시 녹화 시작
if (dangerDetected) {
  mediaRecorder.start()
  setTimeout(() => mediaRecorder.stop(), 30000) // 30초 후 정지
}
```

---

**참고**: 이 기능은 실제 비디오 스트리밍과 AI 분석이 통합되어야 완전히 작동합니다. 현재는 UI/UX 프로토타입입니다.

