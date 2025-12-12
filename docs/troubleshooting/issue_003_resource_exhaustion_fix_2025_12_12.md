# [트러블슈팅] 서버 리소스 고갈 및 프로세스 중단 문제 해결 (CPU/RAM 최적화)

**문서 번호:** ISSUE-003  
**작성일:** 2025년 12월 12일  
**상태:** 해결 완료 (Resolved)  
**영향 범위:** Backend API, Video Analysis Worker, System Stability

---

## 1. 배경 (Context)
배포 환경에서 동영상 분석 및 스트리밍 프로세스가 실행될 때, 서버의 CPU 및 RAM 사용량이 급격히 증가하여 프로세스가 강제 종료(Kill)되거나 서버 전체가 응답 불능 상태에 빠지는 현상이 발생함.

## 2. 문제 상황 (Problem)
- **증상 1:** 비디오 분석 요청 시 RAM 사용량이 수 GB까지 치솟으며 OOM(Out of Memory) 발생.
- **증상 2:** 실시간 스트리밍(HLS) 중 FastAPI 메인 서버가 멈추고 API 응답이 지연되거나 타임아웃 발생.
- **증상 3:** 불필요한 백그라운드 프로세스가 리소스를 점유하고 있음.

## 3. 원인 분석 (Root Cause)

| 컴포넌트 | 원인 상세 | 영향 |
| :--- | :--- | :--- |
| **GeminiService** | 동영상 파일을 메모리에 통째로 로드 (`file.read()`)하여 처리. | 대용량 파일 처리 시 RAM 즉시 고갈. |
| **GeminiService** | OpenCV(`cv2`), FFmpeg, 네트워크 업로드 등 Blocking I/O 작업을 메인 이벤트 루프에서 실행. | 비동기 서버(FastAPI)의 이벤트 루프 차단(Block), 전체 요청 처리 중단. |
| **AnalysisWorker** | 작업량이 적은 초기 단계임에도 워커 프로세스를 2개(`worker-1`, `worker-2`) 가동. | 유휴 상태에서도 기본 메모리 점유율 낭비 (약 100~200MB/process). |
| **AnalysisWorker** | 10분 단위 분석 작업에 대해 5초 간격으로 DB 폴링 수행. | 불필요한 DB 부하 및 CPU 사이클 소모. |
| **HLSStreamGenerator** | OpenCV의 프레임 읽기/인코딩 작업이 `await` 없이 메인 루프에서 실행됨. | 스트리밍 활성화 시 웹 서버(Main Thread) 렉 발생. |
| **Docker Compose** | FastAPI와 Worker 간의 볼륨 마운트 방식 불일치 (Bind Mount vs Named Volume). | 로컬 파일 공유 실패 가능성. |

## 4. 해결 조치 (Solution)

### 4.1. 메모리 최적화 및 비동기 전환 (GeminiService)
- **파일 경로 기반 처리:** 파일을 메모리에 읽지 않고, 파일 경로(`Path`)를 전달하여 필요한 시점에 스트리밍하거나 처리하도록 변경.
- **Blocking I/O 격리:** `cv2`, `subprocess`(FFmpeg), `genai.upload_file` 등 시간이 걸리는 작업은 `asyncio.to_thread` 또는 `run_in_executor`를 사용하여 별도 스레드로 격리.
- **임시 파일 자동 정리:** 분석 완료 후 임시 파일이 확실히 삭제되도록 로직 강화.

### 4.2. 스트리밍 프로세스 스레드 분리 (HLSStreamGenerator)
- 스트리밍 루프 전체를 `loop.run_in_executor`를 통해 별도 스레드로 완전히 분리.
- 메인 FastAPI 서버가 영상 처리 부하로부터 자유로워짐.

### 4.3. 인프라 및 설정 최적화 (Infrastructure)
- **워커 축소:** `docker-compose.production.yml`에서 `vlm-worker-2` 제거 (단일 워커 1개로 운영).
- **폴링 주기 완화:** `AnalysisWorker`의 작업 확인 주기를 5초 → 30초로 변경.
- **볼륨 동기화:** FastAPI와 Worker가 동일한 파일을 바라보도록 `worker`의 볼륨 설정을 Bind Mount(`./backend/...`)로 통일.

### 4.4. 배포 안정성 (Production Safety)
- **Auto-Fallback 비활성화:** 배포 환경(`production`)에서는 데모 영상이 자동으로 재생되지 않도록 `main.py` 로직 수정.

## 5. 검증 및 결과 (Verification)
- **테스트 방법:** 로컬 Docker 환경에서 대용량 영상 업로드 및 분석 시뮬레이션.
- **결과 확인:**
    - 메모리 사용량: 대폭 감소 (파일 크기에 비례하지 않고 일정 수준 유지).
    - 서버 응답성: 분석 중에도 로그인, 페이지 이동 등 API 응답 즉각적임.
    - 리소스 안정성: 워커 1개로도 충분히 작업 큐 소화 가능 확인.

## 6. 향후 권장 사항 (Recommendations)
1. **모니터링 강화:** 배포 후 Prometheus/Grafana 등을 통해 실제 메모리 사용 패턴 추적 권장.
2. **S3 수명 주기 정책:** `temp_videos` 버킷의 객체가 자동으로 삭제되도록 AWS S3 수명 주기(Lifecycle) 정책 설정 필요.
3. **스케일 아웃:** 추후 카메라 대수 10대 이상으로 증가 시 워커 개수 다시 증설 고려.

## 7. 추가 수정 사항 (2025-12-12 오후 업데이트)
오전의 리소스 최적화 이후, 장시간 구동 시 발생할 수 있는 잠재적 리소스 누수(Resource Leak) 및 디스크 공간 축적 문제를 해결하기 위해 추가적인 안정화 작업을 수행함.

### 7.1. FFmpeg 파이프 누수 해결 (ResourceWarning)
- **문제:** `HLSStreamGenerator` 및 `GeminiService`에서 FFmpeg 프로세스 종료 시 `stdin` 파이프가 명시적으로 닫히지 않아 `ResourceWarning: unclosed file` 경고가 발생하며, 장시간 운영 시 파일 디스크립터(FD) 고갈 위험이 있음.
- **해결:** `shutdown` 메서드 등에서 `process.stdin.close()` 및 `process.wait()`를 호출하여 파이프와 프로세스 자원을 확실하게 반환하도록 수정.

### 7.2. 디스크 공간 관리 자동화 (Disk Cleanup)
- **HLS 세그먼트 정리:** 스트리밍이 지속될수록 쌓이는 `.ts` 파일들을 `m3u8` 플레이리스트 갱신 시점에 맞춰 오래된 파일부터 자동 삭제하는 로직 추가 (`_cleanup_old_segments`).
- **로컬 아카이브 삭제:** S3 업로드 및 분석이 완료된 `archive_*.mp4` 파일이 로컬 디스크에 남지 않도록 분석 완료 직후 삭제 로직(`os.remove`) 강화.

### 7.3. 스케줄러 안정성 강화
- **중복 작업 방지:** `SegmentAnalysisScheduler`가 비정상 종료된 작업이나 중복된 `pending` 작업을 생성하지 않도록 상태 확인 로직 보완.
