# HLS 라이브 스트리밍 시스템 테스트 가이드

## 📋 개요

이 문서는 `feat/mergemonitor` 브랜치에서 구현된 HLS 라이브 스트리밍 시스템을 테스트하는 방법을 안내합니다.

---

## 🚀 시작하기

### 1. 환경 준비

#### 필수 요구사항
- Python 3.8+
- Node.js 16+
- MySQL 데이터베이스
- FFmpeg (HLS 인코딩용)

#### FFmpeg 설치 확인
```bash
# Windows
ffmpeg -version

# FFmpeg가 없다면 설치
# 1. https://www.gyan.dev/ffmpeg/builds/ 에서 다운로드
# 2. 압축 해제 후 bin 폴더를 PATH에 추가
# 3. 또는 backend/bin/ 폴더에 ffmpeg.exe 복사
```

### 2. 백엔드 서버 시작

```bash
cd backend

# 가상환경 활성화 (선택사항)
# python -m venv venv
# venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정 (.env 파일 확인)
# - DATABASE_URL
# - GOOGLE_API_KEY (Gemini API)

# 데이터베이스 테이블 생성
python -m app.init_db

# 서버 시작
python run.py
```

**예상 출력:**
```
============================================================
🚀 DailyCam Backend 시작
============================================================

📊 데이터베이스 연결 확인 중...
✅ 데이터베이스 연결 성공!

📋 데이터베이스 테이블 확인 중...
✅ 데이터베이스 테이블 준비 완료!

📌 사용 가능한 테이블:
   - users
   - realtime_events
   - segment_analyses
   - hourly_analyses
   - daily_reports
   ...

============================================================
✨ 서버가 준비되었습니다!
   API 문서: http://localhost:8000/docs
============================================================
```

### 3. 프론트엔드 서버 시작

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

**예상 출력:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 🧪 테스트 시나리오

### 시나리오 1: HLS 스트림 시작 (기본)

#### 1단계: 모니터링 페이지 접속
```
http://localhost:5173/monitoring
```

#### 2단계: HLS 스트림 시작 버튼 클릭
- 화면 하단의 **"HLS 스트림 시작"** 버튼 클릭
- 버튼이 "시작 중..."으로 변경되는지 확인

#### 3단계: 스트림 재생 확인
- 비디오가 자동으로 재생되는지 확인
- 좌측 상단에 "LIVE" 표시가 나타나는지 확인
- 우측 상단에 "AI 분석 중..." 표시 확인

#### 4단계: 콘솔 로그 확인 (개발자 도구)
```
HLS 스트림 시작 요청...
HLS 스트림 시작 응답: { playlist_url: "/api/live-monitoring/hls/camera-1/camera-1.m3u8", ... }
HLS 매니페스트 로드됨, 재생 시작
```

#### 5단계: 백엔드 로그 확인
```
[HLS 스트림] ✅ FFmpeg 경로: C:\...\ffmpeg.exe
[HLS 스트림] 시작: camera-1
[HLS 스트림] ✅ FFmpeg 프로세스 시작 성공 (PID: xxxxx)
[HLS 스트림] HLS 플레이리스트 생성 대기 중...
[HLS 스트림] ✅ HLS 플레이리스트 생성 완료: ...
[HLS 스트림] 프레임 전송 시작 (target_fps: 5.0, 간격: 0.200초)
```

#### 예상 결과
- ✅ 비디오가 정상적으로 재생됨
- ✅ "LIVE" 표시가 나타남
- ✅ 재생/일시정지 버튼 작동
- ✅ 음소거 버튼 작동

---

### 시나리오 2: 실시간 이벤트 탐지

#### 1단계: 스트림 시작 후 45초 대기
- HLS 스트림이 재생 중인 상태에서 45초 대기

#### 2단계: 백엔드 로그 확인
```
[Gemini 분석] 시작...
[Gemini 분석] 완료: 활동 감지 (severity: info)
[실시간 탐지] 1개 이벤트 저장됨
```

#### 3단계: API로 이벤트 조회
```bash
curl http://localhost:8000/api/live-monitoring/events/camera-1/latest?limit=10
```

#### 예상 응답
```json
{
  "camera_id": "camera-1",
  "count": 1,
  "events": [
    {
      "id": 1,
      "timestamp": "2025-12-03T14:30:00",
      "event_type": "safety",
      "severity": "safe",
      "title": "활동 감지",
      "description": "아이가 안전하게 놀고 있습니다.",
      "location": "거실",
      "metadata": {
        "gemini_analysis": true,
        "current_activity": {...},
        "safety_status": {...}
      }
    }
  ]
}
```

#### 예상 결과
- ✅ 45초마다 Gemini 분석 실행
- ✅ 이벤트가 데이터베이스에 저장됨
- ✅ API로 이벤트 조회 가능

---

### 시나리오 3: 10분 간격 영상 분석

#### 1단계: 스트림 시작 후 10분 30초 대기
- HLS 스트림이 재생 중인 상태에서 10분 30초 대기

#### 2단계: 백엔드 로그 확인
```
[10분 분석 스케줄러] 다음 분석 시간: 14:10:30 (xxx초 후)
[10분 분석 스케줄러] 분석 시작: 14:00:00 ~ 14:10:00
[10분 분석 스케줄러] 분석 중: segment_20251203_140000.mp4
[10분 분석 스케줄러] 분석 완료: 14:00:00 ~ 14:10:00
  안전 점수: 95
  사건 수: 0
```

#### 3단계: API로 분석 결과 조회
```bash
curl http://localhost:8000/api/live-monitoring/segment-analyses/camera-1?limit=10
```

#### 예상 응답
```json
{
  "camera_id": "camera-1",
  "total": 1,
  "analyses": [
    {
      "id": 1,
      "segment_start": "2025-12-03T14:00:00",
      "segment_end": "2025-12-03T14:10:00",
      "safety_score": 95,
      "incident_count": 0,
      "status": "completed",
      "completed_at": "2025-12-03T14:10:35"
    }
  ]
}
```

#### 예상 결과
- ✅ 10분마다 자동 분석 실행
- ✅ 세그먼트 파일 생성 (`temp_videos/hourly_buffer/camera-1/`)
- ✅ 분석 결과가 데이터베이스에 저장됨
- ✅ API로 분석 결과 조회 가능

---

### 시나리오 4: 스트림 중지 및 재시작

#### 1단계: 스트림 중지
- **"스트림 중지"** 버튼 클릭
- 비디오가 멈추는지 확인

#### 2단계: 백엔드 로그 확인
```
[HLS 스트림] 중지 요청: camera-1
[HLS 스트림] 종료: camera-1
[10분 분석 스케줄러] 중지 요청: camera-1
```

#### 3단계: 스트림 재시작
- **"HLS 스트림 시작"** 버튼 다시 클릭
- 비디오가 처음부터 재생되는지 확인

#### 예상 결과
- ✅ 스트림이 정상적으로 중지됨
- ✅ FFmpeg 프로세스가 종료됨
- ✅ 재시작 시 새로운 스트림 생성됨

---

### 시나리오 5: 에러 핸들링

#### 테스트 1: FFmpeg 없이 시작
1. FFmpeg를 PATH에서 제거
2. HLS 스트림 시작 시도
3. 에러 메시지 확인

**예상 로그:**
```
[HLS 스트림] ❌ 오류: FFmpeg가 설치되지 않았거나 PATH에 없습니다
[HLS 스트림] 📥 FFmpeg 설치 방법:
  1. https://www.gyan.dev/ffmpeg/builds/ 에서 다운로드
  2. 압축 해제 후 bin 폴더를 PATH에 추가
  3. 또는 Chocolatey 사용: choco install ffmpeg
```

#### 테스트 2: 영상 파일 없이 시작
1. `videos/camera-1/` 폴더를 비움
2. HLS 스트림 시작 시도
3. 에러 메시지 확인

**예상 응답:**
```json
{
  "detail": "영상 디렉토리가 없습니다: videos/camera-1"
}
```

#### 테스트 3: 네트워크 오류 시뮬레이션
1. 스트림 재생 중 백엔드 서버 일시 중지
2. HLS.js가 자동 복구하는지 확인

**예상 로그 (프론트엔드):**
```
네트워크 오류, 복구 시도...
```

---

## 📊 테스트 체크리스트

### 기본 기능
- [ ] 백엔드 서버 정상 시작
- [ ] 프론트엔드 서버 정상 시작
- [ ] 데이터베이스 테이블 생성
- [ ] 모니터링 페이지 접속

### HLS 스트리밍
- [ ] HLS 스트림 시작 버튼 클릭
- [ ] 비디오 정상 재생
- [ ] "LIVE" 표시 나타남
- [ ] 재생/일시정지 버튼 작동
- [ ] 음소거 버튼 작동
- [ ] 스트림 중지 버튼 작동

### 실시간 이벤트 탐지
- [ ] 45초마다 Gemini 분석 실행
- [ ] 이벤트 데이터베이스 저장
- [ ] API로 이벤트 조회 가능
- [ ] 백엔드 로그에 분석 결과 표시

### 10분 간격 영상 분석
- [ ] 10분마다 자동 분석 실행
- [ ] 세그먼트 파일 생성
- [ ] 분석 결과 데이터베이스 저장
- [ ] API로 분석 결과 조회 가능
- [ ] 백엔드 로그에 분석 결과 표시

### 에러 핸들링
- [ ] FFmpeg 없을 때 에러 메시지 표시
- [ ] 영상 파일 없을 때 에러 메시지 표시
- [ ] 네트워크 오류 자동 복구
- [ ] 미디어 오류 자동 복구

---

## 🐛 문제 해결

### 문제 1: FFmpeg를 찾을 수 없음
**증상:**
```
[HLS 스트림] ❌ 오류: FFmpeg가 설치되지 않았거나 PATH에 없습니다
```

**해결 방법:**
1. FFmpeg 다운로드: https://www.gyan.dev/ffmpeg/builds/
2. 압축 해제 후 `ffmpeg.exe`를 `backend/bin/` 폴더에 복사
3. 또는 FFmpeg bin 폴더를 시스템 PATH에 추가

### 문제 2: HLS 플레이리스트가 생성되지 않음
**증상:**
```
[HLS 스트림] ⚠️ 경고: HLS 플레이리스트가 생성되지 않았습니다
```

**해결 방법:**
1. `temp_videos/hls_buffer/camera-1/hls/` 폴더 확인
2. 폴더 권한 확인
3. FFmpeg 프로세스 로그 확인

### 문제 3: 비디오가 재생되지 않음
**증상:**
- 비디오 플레이어가 검은 화면

**해결 방법:**
1. 브라우저 콘솔에서 에러 확인
2. HLS.js가 지원되는 브라우저인지 확인 (Chrome, Firefox 권장)
3. Safari의 경우 네이티브 HLS 지원 확인
4. 백엔드 로그에서 FFmpeg 오류 확인

### 문제 4: Gemini 분석이 실행되지 않음
**증상:**
```
[Gemini 분석] 오류: API key not valid
```

**해결 방법:**
1. `.env` 파일에서 `GOOGLE_API_KEY` 확인
2. Gemini API 키가 유효한지 확인
3. API 할당량 확인

---

## 📈 성능 모니터링

### CPU 사용률
- FFmpeg 프로세스: 10-30%
- Python 백엔드: 5-10%
- 프론트엔드: 5-10%

### 메모리 사용량
- FFmpeg: 50-100MB
- Python 백엔드: 100-200MB
- 프론트엔드: 50-100MB

### 네트워크 대역폭
- HLS 스트리밍: 약 500-1000 Kbps (480p, 5fps)
- API 요청: 최소

### 디스크 사용량
- HLS 세그먼트: 약 1-2MB/분
- 10분 아카이브: 약 10-20MB/파일

---

## ✅ 테스트 완료 기준

모든 항목이 체크되면 시스템이 정상적으로 작동하는 것입니다:

- ✅ HLS 스트림 시작 및 재생
- ✅ 실시간 이벤트 탐지 (45초 간격)
- ✅ 10분 간격 영상 분석
- ✅ 에러 핸들링 및 자동 복구
- ✅ API 엔드포인트 정상 작동
- ✅ 데이터베이스 저장 및 조회

---

**작성일**: 2025년 12월 3일  
**브랜치**: `feat/mergemonitor`  
**작성자**: AI Assistant

