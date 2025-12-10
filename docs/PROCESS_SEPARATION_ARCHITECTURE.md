# 프로세스 분리 아키텍처

## 날짜
2025-12-03

## 문제점

### 1. 영상 끊김 현상
- HLS 스트리밍과 VLM 분석이 같은 Python 프로세스에서 실행
- VLM 분석 중 무거운 작업(Base64 인코딩, Gemini 호출)이 메인 이벤트 루프 차단
- ThreadPoolExecutor 사용에도 불구하고 CPU 경쟁 발생

### 2. HLS 라이브 동기화 문제
- 페이지 이동 후 복귀 시 이전 시점의 영상이 재생됨
- 라이브 엣지(최신 세그먼트) 추적 실패

## 해결 방안: 완전한 프로세스 분리

### 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI 메인 프로세스                      │
│  - HLS 스트리밍 (FFmpeg 서브프로세스 관리)                    │
│  - 10분 아카이브 생성                                         │
│  - 분석 Job 등록 (analysis_jobs 테이블)                      │
│  - REST API 서빙                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ DB (analysis_jobs 테이블)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   VLM 분석 워커 프로세스                      │
│  - analysis_jobs 테이블 폴링 (5초 간격)                      │
│  - PENDING → PROCESSING → COMPLETED/FAILED                  │
│  - Gemini VLM 분석 수행                                      │
│  - 결과를 DB에 저장                                          │
└─────────────────────────────────────────────────────────────┘
```

### 구현 내용

#### 1. AnalysisJob 모델 (작업 큐)

**파일**: `backend/app/models/live_monitoring/analysis_job.py`

```python
class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    
    id = Column(Integer, primary_key=True)
    camera_id = Column(String(50), nullable=False)
    video_path = Column(String(500), nullable=False)
    segment_start = Column(DateTime, nullable=False)
    segment_end = Column(DateTime, nullable=False)
    status = Column(SQLEnum(JobStatus), default=JobStatus.PENDING)
    
    # 결과
    analysis_result = Column(JSON, nullable=True)
    safety_score = Column(Integer, nullable=True)
    incident_count = Column(Integer, nullable=True)
    
    # 재시도
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # 워커 정보
    worker_id = Column(String(100), nullable=True)
```

#### 2. 스케줄러 수정 (Job 등록만 수행)

**파일**: `backend/app/services/live_monitoring/segment_analyzer.py`

**변경 전**:
- 무거운 VLM 분석을 ThreadPoolExecutor에서 실행
- Base64 인코딩, Gemini 호출 등이 메인 프로세스 CPU 사용

**변경 후**:
```python
async def _register_analysis_job(self):
    """분석 Job을 DB에 등록 (빠르게 완료, 메인 루프 차단 없음)"""
    # 1. 비디오 파일 찾기
    video_path = self._get_segment_video(segment_start)
    
    # 2. Job 등록
    analysis_job = AnalysisJob(
        camera_id=self.camera_id,
        video_path=str(video_path),
        segment_start=segment_start,
        segment_end=segment_end,
        status=JobStatus.PENDING
    )
    db.add(analysis_job)
    db.commit()
```

**효과**:
- Job 등록은 1ms 이내 완료
- HLS 스트리밍에 영향 없음

#### 3. 별도 워커 프로세스

**파일**: `backend/analysis_worker.py`

```python
class AnalysisWorker:
    def __init__(self, worker_id: str = "worker-1"):
        self.worker_id = worker_id
        self.gemini_service = GeminiService()
        self.poll_interval = 5  # 5초마다 폴링
    
    async def _main_loop(self):
        while self.is_running:
            # PENDING 상태의 Job 가져오기
            job = self._get_next_job()
            
            if job:
                await self._process_job(job)
            else:
                await asyncio.sleep(self.poll_interval)
    
    async def _process_job(self, job: AnalysisJob):
        # 1. 파일 안정화 대기
        # 2. Gemini VLM 분석
        # 3. 결과 저장
        # 4. 상태 업데이트 (COMPLETED/FAILED)
```

**실행 방법**:
```bash
# 별도 터미널에서 실행
cd backend
python analysis_worker.py
```

#### 4. HLS 라이브 동기화 개선

**파일**: `frontend/src/pages/Monitoring.tsx`

**추가 설정**:
```typescript
const hls = new Hls({
  // ... 기존 설정
  startPosition: -1,  // 라이브 엣지에서 시작
  liveSyncDuration: 3,
  liveMaxLatencyDuration: 15,
})

// 라이브 엣지 유지
hls.on(Hls.Events.MANIFEST_PARSED, () => {
  if (videoRef.current) {
    // 라이브 스트림의 경우 끝에서 시작
    const duration = videoRef.current.duration
    if (duration && isFinite(duration)) {
      videoRef.current.currentTime = duration - 3  // 3초 버퍼
    }
    videoRef.current.play()
  }
})
```

### 데이터베이스 마이그레이션

```sql
CREATE TABLE analysis_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camera_id VARCHAR(50) NOT NULL,
    video_path VARCHAR(500) NOT NULL,
    segment_start DATETIME NOT NULL,
    segment_end DATETIME NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    analysis_result JSON,
    safety_score INT,
    incident_count INT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    worker_id VARCHAR(100),
    INDEX idx_camera_status (camera_id, status),
    INDEX idx_segment_start (segment_start),
    INDEX idx_status (status)
);
```

### 시스템 시작 순서

1. **FastAPI 서버 시작**:
   ```bash
   cd backend
   python run.py
   ```

2. **VLM 워커 시작** (별도 터미널):
   ```bash
   cd backend
   python analysis_worker.py
   ```

3. **프론트엔드 빌드** (변경 사항 있을 경우):
   ```bash
   cd frontend
   npm run build
   ```

### 모니터링

#### FastAPI 로그
```
[Job 등록] ✅ Job 등록 완료 (ID: 123): archive_20251203_152000.mp4
[Job 등록] 워커 프로세스가 이 Job을 처리할 예정입니다.
```

#### 워커 로그
```
[워커 worker-1] 📋 Job 발견: ID=123, 구간=15:20:00~15:30:00
[워커 worker-1] ⏳ 파일 안정화 대기 중...
[워커 worker-1] ✅ 파일 안정화 완료: 78.83MB
[워커 worker-1] 🤖 Gemini VLM 분석 시작...
[워커 worker-1] ✅ Gemini VLM 분석 완료
[워커 worker-1] ✅ Job 완료: ID=123
  📊 안전 점수: 85
  🚨 사건 수: 3
```

### 장점

1. **완전한 프로세스 격리**
   - HLS 스트리밍과 VLM 분석이 서로 영향 없음
   - CPU, 메모리 리소스 독립적으로 사용

2. **확장성**
   - 워커 프로세스를 여러 개 실행 가능
   - 서버 여러 대에 분산 가능

3. **안정성**
   - 워커 프로세스 크래시 시 메인 서버 영향 없음
   - 재시도 로직으로 일시적 오류 대응

4. **모니터링**
   - Job 상태를 DB에서 직접 확인 가능
   - 워커별 처리 현황 추적 가능

### 추후 개선 사항

1. **Redis 큐 사용** (선택사항)
   - DB 폴링 대신 Redis Pub/Sub 사용
   - 더 빠른 Job 처리

2. **워커 자동 시작**
   - systemd 서비스로 등록
   - Docker Compose로 관리

3. **대시보드**
   - Job 처리 현황 모니터링 UI
   - 워커 상태 확인

## 관련 파일

- `backend/app/models/live_monitoring/analysis_job.py`: Job 모델
- `backend/app/services/live_monitoring/segment_analyzer.py`: Job 등록 스케줄러
- `backend/analysis_worker.py`: 워커 프로세스
- `frontend/src/pages/Monitoring.tsx`: HLS 라이브 동기화

