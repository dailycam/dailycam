# 최종 안정성 개선 사항

## 날짜
2025-12-03

## 문제점

### 1. 두 번째 10분 영상 분석 실패
```
[mov,mp4,m4a,3gp,3g2,mj2 @ 000001f8b33b4cc0] moov atom not found
[비디오 최적화] ❌ 비디오 열기 실패, 원본 사용
[1단계] ❌ 메타데이터 추출 실패: 400 Request contains an invalid argument.
```

**원인**: 
- 10분 단위 아카이브 파일이 FFmpeg에 의해 완전히 작성되기 전에 VLM 분석이 시작됨
- 파일이 아직 완전히 닫히지 않아 `moov atom`이 제대로 작성되지 않음

### 2. 영상이 간헐적으로 끊김
- VLM 분석이 별도 스레드에서 실행되고 있지만, 여전히 약간의 영향이 있음
- 프론트엔드 HLS.js 타임아웃 설정이 충분하지 않음

## 해결 방안

### 1. 백엔드: 파일 안정화 대기 로직 추가

#### 파일: `backend/app/services/live_monitoring/segment_analyzer.py`

**변경 사항 1**: 분석 시작 전 30초 추가 대기
```python
async def _analyze_previous_segment(self):
    """
    이전 10분 분량의 비디오를 분석
    """
    # 파일이 완전히 작성될 때까지 추가 대기 (30초)
    print(f"[10분 분석 스케줄러] ⏳ 파일 완전 작성 대기 중 (30초)...")
    await asyncio.sleep(30)
    
    db = next(get_db())
    # ... 나머지 로직
```

**변경 사항 2**: 파일 크기 안정화 확인
```python
# 파일이 안정화될 때까지 추가 대기 (파일 크기가 변하지 않을 때까지)
print(f"[10분 분석 스케줄러] 📁 파일 안정화 확인 중: {video_path.name}")
prev_size = 0
stable_count = 0
max_wait = 60  # 최대 60초 대기

for _ in range(max_wait):
    current_size = video_path.stat().st_size
    if current_size == prev_size and current_size > 0:
        stable_count += 1
        if stable_count >= 3:  # 3초 동안 크기가 변하지 않으면 안정화된 것으로 판단
            print(f"[10분 분석 스케줄러] ✅ 파일 안정화 완료: {current_size / (1024 * 1024):.2f}MB")
            break
    else:
        stable_count = 0
        prev_size = current_size
    await asyncio.sleep(1)
else:
    print(f"[10분 분석 스케줄러] ⚠️ 파일 안정화 대기 시간 초과, 현재 크기로 진행: {prev_size / (1024 * 1024):.2f}MB")
```

**효과**:
- 파일이 완전히 작성될 때까지 대기하여 `moov atom not found` 오류 방지
- 파일 크기가 안정화되면 즉시 분석 시작 (최대 60초 대기)

### 2. 프론트엔드: HLS.js 타임아웃 및 재시도 설정 강화

#### 파일: `frontend/src/pages/Monitoring.tsx`

**변경 사항**: 세 곳의 HLS.js 초기화 코드 모두 업데이트

```typescript
const hls = new Hls({
  debug: false,
  enableWorker: true,
  lowLatencyMode: true,
  liveSyncDuration: 3,              // 2 → 3초
  liveMaxLatencyDuration: 15,       // 10 → 15초 (VLM 분석 중에도 끊기지 않도록)
  maxBufferLength: 20,              // 15 → 20초
  maxMaxBufferLength: 40,           // 30 → 40초
  backBufferLength: 0,
  manifestLoadingTimeOut: 60000,    // 30초 → 60초
  manifestLoadingMaxRetry: 10,      // 6 → 10회
  levelLoadingTimeOut: 60000,       // 30초 → 60초
  levelLoadingMaxRetry: 10,         // 6 → 10회
  fragLoadingTimeOut: 60000,        // 새로 추가: 세그먼트 로딩 타임아웃
  fragLoadingMaxRetry: 10,          // 새로 추가: 세그먼트 로딩 재시도
})
```

**적용 위치**:
1. 초기 스트림 연결 (라인 89)
2. 비디오 업로드 후 스트림 시작 (라인 261)
3. HLS 스트림 시작 버튼 (라인 380)

**효과**:
- VLM 분석 중에도 HLS 스트림이 끊기지 않음
- 네트워크 지연이나 서버 부하 시 더 많은 재시도로 안정성 향상
- 버퍼 크기 증가로 일시적인 지연에 대응

## 테스트 방법

1. **백엔드 재시작**:
   ```bash
   cd backend
   python run.py
   ```

2. **프론트엔드 재빌드**:
   ```bash
   cd frontend
   npm run build
   ```

3. **브라우저 하드 리프레시**: `Ctrl + Shift + R`

4. **모니터링 페이지에서 확인**:
   - 10분 단위로 VLM 분석이 실행될 때 로그 확인
   - "파일 완전 작성 대기 중", "파일 안정화 확인 중", "파일 안정화 완료" 메시지 확인
   - 영상이 끊기지 않고 계속 재생되는지 확인

## 예상 결과

### 성공 로그 예시
```
[10분 분석 스케줄러] 🚀 분석 시작 (백그라운드)
[10분 분석 스케줄러] 다음 분석 시간: 15:30:30 (600초 후)
[10분 분석 스케줄러] ⏳ 파일 완전 작성 대기 중 (30초)...
[10분 분석 스케줄러] 📅 현재 시간: 15:20:30
[10분 분석 스케줄러] 🎯 분석 대상 구간: 15:00:00 ~ 15:10:00
[10분 분석 스케줄러] ✅ 정확한 아카이브 파일 발견: archive_20251203_150000.mp4
[10분 분석 스케줄러] 📁 파일 안정화 확인 중: archive_20251203_150000.mp4
[10분 분석 스케줄러] ✅ 파일 안정화 완료: 62.50MB
[10분 분석 스케줄러] 분석 중: archive_20251203_150000.mp4
[10분 분석 스케줄러] 비디오 파일 크기: 62.50MB ✅
[10분 분석 스케줄러] Gemini VLM 분석 시작...
[0단계] 비디오 최적화 시작 (원본 크기: 62.50MB)
[비디오 최적화] 전처리 시작...
[비디오 최적화] 640x480 30.0fps -> 640x480 1.0fps
[비디오 최적화] ✅ 완료: 62.50MB -> 5.89MB (90.6% 감소)
[0단계] ✅ 비디오 최적화 완료 (최적화 크기: 5.89MB)
[1단계] 비디오에서 메타데이터 추출 중...
[1단계] ✅ Gemini VLM 응답 수신
[10분 분석 스케줄러] ✅ Gemini VLM 분석 완료
[10분 분석 스케줄러] ✅ 분석 완료: 15:00:00 ~ 15:10:00
  📊 안전 점수: 85
  🚨 사건 수: 3
  📁 비디오 파일: archive_20251203_150000.mp4
```

### HLS 스트림 안정성
- VLM 분석 중에도 HLS 스트림이 계속 재생됨
- `[HLS 스트림] 프레임 전송: X개` 로그가 계속 출력됨
- 프론트엔드에서 영상이 끊기지 않음

## 기술적 세부사항

### 파일 안정화 로직
1. **초기 30초 대기**: 스케줄러가 실행된 직후 30초 대기하여 FFmpeg가 파일을 닫을 시간을 줌
2. **파일 크기 모니터링**: 1초마다 파일 크기를 확인
3. **안정화 판단**: 3초 연속으로 파일 크기가 변하지 않으면 안정화된 것으로 판단
4. **최대 대기 시간**: 60초까지만 대기하고, 그 이후에는 현재 상태로 진행

### HLS.js 타임아웃 전략
- **manifestLoadingTimeOut**: 플레이리스트 로딩 타임아웃 (60초)
- **levelLoadingTimeOut**: 레벨(품질) 로딩 타임아웃 (60초)
- **fragLoadingTimeOut**: 세그먼트 로딩 타임아웃 (60초)
- **재시도 횟수**: 각각 10회로 증가하여 일시적인 지연에 대응

## 관련 문서
- `docs/VLM_NON_BLOCKING_SOLUTION.md`: VLM 분석 논블로킹 처리
- `docs/PERFORMANCE_OPTIMIZATION.md`: 실시간 Gemini 분석 비활성화
- `docs/STABILITY_IMPROVEMENTS.md`: 이전 안정성 개선 사항

