## 스트리밍 구성요소 한눈에 보기 (FFmpeg & HLS 정리)

이 문서는 **현재 코드 기준**으로 라이브 스트리밍 파이프라인에서  
**FFmpeg**와 **HLS / hls.js**가 각각 어떤 역할을 맡는지 정리한 개요입니다.

---

## 1. 전체 흐름 요약

1. **원본 영상 준비**
   - 업로드된 MP4 / 아카이브 / 홈캠 스트림 등
2. **FFmpeg**
   - 원본 영상을 읽어서 **HLS 포맷(.m3u8 + .ts)** 으로 인코딩
   - 하이라이트 클립/썸네일/아카이브 영상 등 **실제 파일 생성**
3. **FastAPI (라이브 모니터링 API)**
   - FFmpeg가 생성한 HLS 파일들을 HTTP로 서빙
4. **프론트엔드 (hls.js)**
   - HLS 플레이리스트(.m3u8)를 다운받고
   - 세그먼트(.ts)를 순차적으로 가져와 `<video>`에 전달
   - 버퍼, 라이브 엣지, 재연결, 오류 복구 등 재생 품질 관리

---

## 2. FFmpeg의 역할 (백엔드)

### 2.1 HLS 스트림 생성

- 주요 파일: `backend/app/services/live_monitoring/hls_stream_generator.py`
- 역할:
  - 여러 영상 파일을 concat 리스트로 묶고
  - **단일 FFmpeg 프로세스**로 아래를 동시에 수행:
    - 라이브 시청용 HLS 스트림 생성 (`.m3u8`, `.ts`)
    - 10분 단위 아카이브 영상 파일 생성
  - FFmpeg 프로세스 상태를 모니터링하고 필요 시 재시작
- FFmpeg가 결정하는 것:
  - 인코딩 코덱/비트레이트, 키 프레임 간격(GOP)
  - HLS 세그먼트 길이, 버퍼 크기
  - 디스크에 어떤 경로/파일 이름으로 저장할지

### 2.2 하이라이트 / 클립 / 썸네일 생성

- 주요 파일:
  - `backend/app/services/highlight_clip_service.py`
  - `backend/app/services/analysis_service.py`
- 역할:
  - 긴 원본 영상에서 이벤트 구간만 잘라 **짧은 클립 MP4** 생성
  - 특정 시점 프레임을 추출해 **썸네일 이미지** 생성
  - 재인코딩 옵션(H.264, faststart 등)을 제어해 스트리밍 친화적인 파일 만들기

### 2.3 비디오 최적화

- 주요 파일: `backend/app/services/gemini_service.py` 일부
- 역할:
  - AI 분석 전에 FFmpeg로 비디오를 재인코딩해
    - 표준 H.264 + 적절한 비트레이트
    - `faststart` 등으로 **스트리밍 가능한 MP4** 로 변환

> 정리: **FFmpeg는 “영상 공장”** 입니다.  
> 원본 데이터를 받아 인코딩·자르기·포맷 변환을 통해  
> **실제 디스크 상의 HLS/MP4/썸네일 파일을 만드는 역할**을 합니다.

---

## 3. HLS / hls.js의 역할 (프론트엔드)

### 3.1 HLS 프로토콜 레벨

- FFmpeg가 만든 것:
  - HLS 플레이리스트: `*.m3u8`
  - HLS 세그먼트: `*.ts`
- FastAPI는 이 파일들을 정적 파일처럼 HTTP로 서빙합니다.
- 클라이언트(브라우저)는:
  - 먼저 `.m3u8`을 요청해서 세그먼트 목록을 받고
  - 그 안에 정의된 `.ts`를 순차적으로 받아 재생

즉, **HLS는 “HTTP 기반으로 조각난 영상(ts)을 순서대로 받아 재생하는 스트리밍 규격”** 입니다.

### 3.2 hls.js (브라우저 플레이어)

- 주요 파일: `frontend/src/pages/Monitoring.tsx`
- 하는 일:
  - 브라우저가 HLS를 네이티브로 지원하지 않을 때  
    **MediaSource + hls.js** 로 HLS 재생
  - `.m3u8` 매니페스트 파싱, `.ts` 세그먼트 요청/버퍼링
  - **라이브 엣지 추적, 버퍼 길이, 오류 복구** 등 재생 품질을 JS 레벨에서 제어
  - 설정 예시:
    - `liveSyncDuration`, `liveMaxLatencyDuration`
    - `maxBufferLength`, `maxMaxBufferLength`, `backBufferLength`
    - `NETWORK_ERROR`/`MEDIA_ERROR` 시 자동 재시도 또는 복구

> 정리: **hls.js는 “배송·재생 담당”** 입니다.  
> 이미 FFmpeg가 만들어 둔 HLS 스트림을 네트워크로 가져와  
> 브라우저에서 끊김 없이 보여주는 역할을 합니다.

---

## 4. 둘의 경계 정리

| 구분 | FFmpeg | HLS / hls.js |
|------|--------|--------------|
| 위치 | 백엔드 (서버 프로세스) | 프론트엔드 (브라우저 JS) |
| 책임 | 인코딩, 자르기, 파일 생성 | 플레이리스트 파싱, 세그먼트 다운로드, 재생 제어 |
| 다루는 것 | 원본/아카이브/클립 영상 파일 | `.m3u8`, `.ts` HLS 리소스 |
| 리소스 사용 | CPU, 디스크 I/O 중심 | 네트워크, 브라우저 메모리/CPU |
| 문제 유형 | 인코딩 실패, 파일 없음, FFmpeg 프로세스 종료 | 버퍼링, 지연, 재연결, 브라우저 호환성 |

**문제 디버깅 방향**

- **영상이 깨진다 / 코덱 문제 / 파일이 안 생긴다**  
  → FFmpeg 설정, 서버 자원, 파일 경로, 권한 확인

- **지연이 크다 / 자주 끊긴다 / 재연결이 이상하다**  
  → hls.js 옵션, 세그먼트 길이, 네트워크 상태, 브라우저 콘솔 로그 확인

---

## 5. 관련 문서 / 코드 레퍼런스

- 설계 문서
  - `docs/backend/LIVE_STREAMING_ARCHITECTURE.md`
  - `docs/troubleshooting/HLS_LATENCY_GUIDE(HLS_지연시간_가이드).md`
  - `docs/troubleshooting/STREAMING_PERFORMANCE_GUIDE(스트리밍_성능_최적화).md`
- 백엔드 코드
  - `backend/app/services/live_monitoring/hls_stream_generator.py`
  - `backend/app/services/highlight_clip_service.py`
  - `backend/app/services/analysis_service.py`
- 프론트엔드 코드
  - `frontend/src/pages/Monitoring.tsx`

