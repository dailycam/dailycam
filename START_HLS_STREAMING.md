# HLS 스트리밍 시작 가이드

## 🚀 빠른 시작

### 1. 백엔드 시작
```bash
cd backend
python run.py
```

### 2. 프론트엔드 시작 (새 터미널)
```bash
cd frontend
npm run dev
```

### 3. 브라우저에서 테스트
1. http://localhost:5173 접속
2. 모니터링 페이지로 이동
3. **"HLS 스트림 시작"** 버튼 클릭
4. 비디오 재생 확인 ✅

### 4. 이어서 재생 테스트
1. 스트림이 재생 중일 때
2. 대시보드 또는 다른 페이지로 이동
3. 다시 모니터링 페이지로 복귀
4. **영상이 이어서 재생되는지 확인** ✅

## 🎯 핵심 기능

### ✅ 진짜 실시간 스트림
- 백그라운드에서 계속 실행
- 페이지를 벗어나도 스트림 유지
- 재연결 시 현재 시간부터 자동 재생

### ✅ 자동 이어서 재생
```
예시:
- 00:05 - 스트림 시작
- 00:08 - 대시보드로 이동 (백그라운드에서 계속 실행)
- 00:11 - 모니터링 페이지로 복귀
→ 00:11부터 재생 (00:05가 아님!)
```

### ✅ 10분 단위 아카이브
- `temp_videos/hls_buffer/camera-1/archive/` 폴더에 자동 저장
- 메타데이터 추출용 파일
- Gemini AI 분석 대상

## 🔍 디버깅

### 플레이리스트 확인
```
http://localhost:8000/api/live-monitoring/hls/camera-1/camera-1.m3u8
```

### HLS 세그먼트 파일 확인
```
temp_videos/hls_buffer/camera-1/hls/
├── camera-1.m3u8
├── camera-1_000.ts
├── camera-1_001.ts
└── ...
```

### 백엔드 로그 확인
```
[HLS 스트림] 시작: camera-1
[HLS 스트림] 영상 재생 완료: clip_001.mp4
[HLS 아카이브] 새 10분 구간 시작: archive_20251202_140000.mp4
```

## 🏠 실제 홈캠 연동

### Postman 또는 curl로 테스트
```bash
curl -X POST "http://localhost:8000/api/live-monitoring/start-hls-stream/camera-1?camera_url=rtsp://192.168.1.100:554/stream&enable_analysis=true&age_months=12"
```

### 프론트엔드는 동일하게 작동
- 가짜 영상이든 실제 홈캠이든 **동일한 UI**
- 백엔드에서 자동으로 처리

## 📊 비교: 기존 vs HLS

| 항목 | 기존 (MJPEG) | HLS |
|------|-------------|-----|
| 재연결 시 | ❌ 처음부터 재생 | ✅ 현재 시간부터 재생 |
| 백그라운드 실행 | ❌ | ✅ |
| 이어서 재생 | ❌ | ✅ |
| 브라우저 지원 | 모든 브라우저 | 모든 브라우저 |
| 홈캠 연동 | 가능 | 가능 |
| 성능 | 낮음 | 높음 |

## ⚠️ 주의사항

### FFmpeg 필요
HLS 스트리밍은 FFmpeg를 사용합니다. 설치 확인:
```bash
ffmpeg -version
```

설치되지 않았다면:
- **Windows**: https://www.gyan.dev/ffmpeg/builds/
- **Mac**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

### 포트 확인
- 백엔드: http://localhost:8000
- 프론트엔드: http://localhost:5173

## 🎉 성공 확인

다음이 모두 작동하면 성공입니다:
1. ✅ HLS 스트림 시작 버튼 클릭 → 비디오 재생
2. ✅ 대시보드 이동 → 다시 모니터링 복귀 → 이어서 재생
3. ✅ 백엔드 로그에 "[HLS 스트림] 시작" 메시지
4. ✅ `temp_videos/hls_buffer/camera-1/hls/` 폴더에 .ts 파일 생성
5. ✅ `temp_videos/hls_buffer/camera-1/archive/` 폴더에 10분 단위 .mp4 파일 생성

## 🚀 다음 단계

1. ✅ 가짜 스트림으로 테스트
2. ⏳ 실제 홈캠 RTSP URL 연동
3. ⏳ 성능 최적화 (버퍼 크기, 세그먼트 길이 조정)
4. ⏳ 모바일 브라우저 테스트

