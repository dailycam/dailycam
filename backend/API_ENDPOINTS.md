# FastAPI 엔드포인트 가이드

## 📍 기본 정보

- **서버 주소**: `http://localhost:8000`
- **API 문서**: `http://localhost:8000/docs` (Swagger UI)
- **대체 문서**: `http://localhost:8000/redoc` (ReDoc)

## 📊 일일 리포트 API

### 1. 최신 리포트 조회
```
GET /api/daily-report/latest
```
**응답 예시**:
```json
{
  "report_id": 1,
  "analysis_id": 1,
  "overall_summary": "오늘 아이는 전반적으로 안전하게 활동했습니다...",
  "safety_metrics": {
    "total_monitoring_time": "8시간 45분",
    "safe_zone_percentage": 92,
    "activity_level": "높음"
  },
  "time_slots": [
    {
      "time": "09:00 - 12:00",
      "activity": "낮은 활동량",
      "safety_score": 95,
      "incidents": 0,
      "summary": "오전 시간대에는 안전하게 활동했습니다"
    }
  ],
  "risk_priorities": [...],
  "action_recommendations": [...],
  "highlights": [
    {
      "id": "highlight_1_fall",
      "title": "넘어짐",
      "timestamp": "00:00:04",
      "duration": "0:30",
      "video_url": "/api/highlights/highlight_1_fall.mp4",
      "description": "아이가 뛰어가던 중 넘어졌습니다"
    }
  ]
}
```

### 2. 특정 리포트 조회
```
GET /api/daily-report/{report_id}
```

### 3. 리포트 생성
```
POST /api/daily-report/from-analysis
Content-Type: application/json

{
  "analysis_id": 1,
  "total_incidents": 3,
  "falls": 1,
  "dangerous_actions": 1,
  "safety_score": 75,
  "timeline_events": [...],
  "summary": "...",
  "recommendations": [...],
  "video_path": "/path/to/video.mp4"
}
```

## 🎬 하이라이트 영상

### 하이라이트 영상 다운로드/재생
```
GET /api/highlights/{filename}
```
예: `http://localhost:8000/api/highlights/highlight_1_fall.mp4`

리포트의 `highlights` 배열에 `video_url`이 포함되어 있습니다.

## 📈 그래프 데이터

그래프 데이터는 리포트 조회 시 `time_slots` 배열에 포함되어 있습니다:

```json
{
  "time_slots": [
    {
      "time": "09:00 - 12:00",
      "activity": "낮은 활동량",
      "safety_score": 95,
      "incidents": 0
    },
    {
      "time": "12:00 - 15:00",
      "activity": "높은 활동량",
      "safety_score": 85,
      "incidents": 3
    }
  ]
}
```

프론트엔드에서 이 데이터를 Recharts로 시각화합니다.

## 🖼️ 이미지 분류 API

### 1. 이미지 파일 업로드
```
POST /api/image-classification/classify
Content-Type: multipart/form-data

파라미터: image (파일)
```

### 2. 이미지 URL로 분류
```
POST /api/image-classification/classify-url
Content-Type: application/json

{
  "image_url": "https://example.com/image.jpg"
}
```

### 3. 모델 상태 확인
```
GET /api/image-classification/health
```

## 🧪 테스트 방법

### 1. 브라우저에서 테스트
- `http://localhost:8000/docs` 접속
- 각 엔드포인트를 클릭하여 "Try it out" 버튼으로 테스트

### 2. curl로 테스트
```bash
# 최신 리포트 조회
curl http://localhost:8000/api/daily-report/latest

# 특정 리포트 조회
curl http://localhost:8000/api/daily-report/1

# 이미지 분류
curl -X POST "http://localhost:8000/api/image-classification/classify" \
  -F "image=@test.jpg"
```

### 3. 프론트엔드에서 사용
```typescript
// 리포트 조회
const response = await fetch('http://localhost:8000/api/daily-report/latest')
const report = await response.json()

// 하이라이트 영상 재생
<video src={`http://localhost:8000${highlight.video_url}`} />
```

## ✅ 확인 사항

1. **서버 실행 확인**: `http://localhost:8000/` 접속 시 API 정보 표시
2. **문서 확인**: `http://localhost:8000/docs` 접속 시 Swagger UI 표시
3. **리포트 데이터**: `http://localhost:8000/api/daily-report/latest` 접속 시 JSON 응답
4. **하이라이트 영상**: 리포트의 `video_url`로 접근 가능

