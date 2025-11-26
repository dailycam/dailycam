# DailyCam 데이터베이스 스키마 - 카메라 및 모니터링

## 개요
카메라, 홈캠, 동영상, 실시간 모니터링 기능에서 사용하는 데이터베이스 스키마입니다.
프론트엔드 더미 데이터를 기반으로 실제로 필요한 데이터만 저장합니다.

---

## 1. 카메라 정보 (cameras)

### 목적
시스템에 등록된 카메라 정보를 저장합니다. **카메라 설정 페이지와 실시간 모니터링 페이지에 사용됩니다.**

### 테이블: `cameras`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | VARCHAR(50) | PRIMARY KEY | 카메라 고유 ID (예: 'camera-1') | `Camera.id` | 카메라 고유 식별자 |
| `name` | VARCHAR(100) | NOT NULL | 카메라 이름 (예: '거실 카메라') | `Camera.name` | 카메라 설정 페이지에 표시 |
| `location` | VARCHAR(100) | NOT NULL | 카메라 위치 (예: '거실', '아이방') | `Camera.location` | 카메라 위치 표시 및 필터링 |
| `status` | ENUM('online', 'offline') | DEFAULT 'offline' | 카메라 상태 | `Camera.status` | 실시간 모니터링에서 카메라 상태 표시 |
| `rtsp_url` | VARCHAR(255) | NULL | RTSP 스트림 URL | `Camera.rtspUrl` | 실시간 스트리밍 시 사용 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 카메라 등록 시점 추적 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 수정 시간 | - | 카메라 정보 수정 시점 추적 |

### 필요 이유
- 카메라 설정 페이지에서 카메라 목록 표시
- 실시간 모니터링에서 카메라 선택 및 상태 확인
- RTSP 스트림 URL 관리

---

## 2. 비디오 파일 정보 (videos)

### 목적
업로드된 비디오 파일의 메타데이터를 저장합니다. **비디오 업로드 및 스트리밍에 사용됩니다.**

### 테이블: `videos`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 비디오 고유 ID | - | 비디오 고유 식별자 |
| `camera_id` | VARCHAR(50) | FOREIGN KEY(cameras.id) | 카메라 ID | `UploadVideoResponse.camera_id` | 어떤 카메라의 비디오인지 추적 |
| `file_path` | VARCHAR(500) | NOT NULL | 비디오 파일 저장 경로 | `UploadVideoResponse.video_path` | 스트리밍 시 파일 경로 참조 |
| `filename` | VARCHAR(255) | NOT NULL | 원본 파일명 | `UploadVideoResponse.filename` | 파일 관리 및 표시 |
| `file_size_bytes` | BIGINT | NULL | 파일 크기 (바이트) | - | 파일 크기 확인 및 관리 |
| `duration_seconds` | INT | NULL | 비디오 길이 (초) | - | 비디오 길이 표시 |
| `recorded_at` | DATETIME | NOT NULL | 녹화 시작 시간 | - | 비디오 녹화 시점 추적 |
| `uploaded_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 업로드 시간 | - | 비디오 업로드 시점 추적 |
| `analysis_status` | ENUM('pending', 'processing', 'completed', 'failed') | DEFAULT 'pending' | 분석 상태 | - | 분석 완료 여부 확인 |
| `analyzed_at` | DATETIME | NULL | 분석 완료 시간 | - | 분석 완료 시점 추적 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 인덱스
- `idx_camera_recorded` ON (`camera_id`, `recorded_at`)

### 필요 이유
- 비디오 파일 관리 및 추적
- 실시간 모니터링에서 비디오 업로드 및 스트리밍
- 분석 완료 여부 확인
- 스트리밍 시 파일 경로 참조

---

## 3. 스트림 세션 (stream_sessions)

### 목적
실시간 모니터링에서 생성된 스트림 세션 정보를 저장합니다. **실시간 모니터링 페이지의 스트림 관리에 사용됩니다.**

### 테이블: `stream_sessions`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 스트림 세션 ID | - | 스트림 세션 고유 식별자 |
| `camera_id` | VARCHAR(50) | FOREIGN KEY(cameras.id) | 카메라 ID | `LiveMonitoring` selectedCamera | 어떤 카메라의 스트림인지 추적 |
| `video_id` | INT | FOREIGN KEY(videos.id) | 비디오 ID | - | 어떤 비디오를 스트리밍하는지 추적 |
| `stream_url` | VARCHAR(500) | NOT NULL | 스트림 URL | `LiveMonitoring` streamUrl | 프론트엔드에서 스트림 재생 |
| `is_loop` | BOOLEAN | DEFAULT TRUE | 반복 재생 여부 | `LiveMonitoring` streamLoop | 스트림 반복 재생 설정 |
| `playback_speed` | DECIMAL(3,2) | DEFAULT 1.0 | 재생 속도 | `LiveMonitoring` streamSpeed | 스트림 재생 속도 설정 |
| `is_active` | BOOLEAN | DEFAULT TRUE | 스트림 활성 상태 | `LiveMonitoring` isStreamActive | 스트림 활성 상태 추적 |
| `started_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 스트림 시작 시간 | - | 스트림 시작 시점 추적 |
| `stopped_at` | DATETIME | NULL | 스트림 중지 시간 | - | 스트림 중지 시점 추적 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 인덱스
- `idx_camera_active` ON (`camera_id`, `is_active`)

### 필요 이유
- 실시간 모니터링에서 스트림 세션 관리
- 스트림 URL 및 설정 저장
- 스트림 활성 상태 추적
- 스트림 재연결 시 이전 세션 정보 참조

---

## 4. 카메라 설정 (camera_settings)

### 목적
각 카메라의 설정 정보를 저장합니다. **카메라 설정 페이지에 사용됩니다.**

### 테이블: `camera_settings`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 설정 ID | - | 설정 고유 식별자 |
| `camera_id` | VARCHAR(50) | FOREIGN KEY(cameras.id) UNIQUE | 카메라 ID | - | 카메라별 설정 연결 |
| `recording_enabled` | BOOLEAN | DEFAULT TRUE | 녹화 활성화 여부 | - | 자동 녹화 설정 |
| `motion_detection_enabled` | BOOLEAN | DEFAULT TRUE | 움직임 감지 활성화 여부 | - | 움직임 감지 설정 |
| `night_vision_enabled` | BOOLEAN | DEFAULT FALSE | 야간 모드 활성화 여부 | - | 야간 모드 설정 |
| `resolution` | VARCHAR(20) | DEFAULT '1080p' | 해상도 설정 | - | 비디오 해상도 설정 |
| `frame_rate` | INT | DEFAULT 30 | 프레임 레이트 | - | 비디오 프레임 레이트 설정 |
| `storage_days` | INT | DEFAULT 30 | 저장 기간 (일) | - | 비디오 자동 삭제 기간 설정 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 수정 시간 | - | 설정 변경 시점 추적 |

### 필요 이유
- 카메라 설정 페이지에서 설정 정보 표시 및 수정
- 카메라별 개별 설정 관리
- 녹화 및 감지 기능 제어

---

## 5. 비디오 업로드 이력 (video_uploads)

### 목적
비디오 업로드 이력을 저장합니다. **비디오 업로드 관리 및 추적에 사용됩니다.**

### 테이블: `video_uploads`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 업로드 ID | - | 업로드 고유 식별자 |
| `camera_id` | VARCHAR(50) | FOREIGN KEY(cameras.id) | 카메라 ID | `UploadVideoResponse.camera_id` | 어떤 카메라의 업로드인지 추적 |
| `video_id` | INT | FOREIGN KEY(videos.id) | 비디오 ID | - | 업로드된 비디오 연결 |
| `upload_status` | ENUM('pending', 'uploading', 'completed', 'failed') | DEFAULT 'pending' | 업로드 상태 | - | 업로드 진행 상태 추적 |
| `upload_progress` | INT | DEFAULT 0 | 업로드 진행률 (%) | - | 업로드 진행률 표시 |
| `error_message` | TEXT | NULL | 오류 메시지 | - | 업로드 실패 시 오류 정보 |
| `uploaded_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 업로드 시작 시간 | - | 업로드 시작 시점 추적 |
| `completed_at` | DATETIME | NULL | 업로드 완료 시간 | - | 업로드 완료 시점 추적 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 비디오 업로드 진행 상태 추적
- 업로드 실패 시 오류 정보 저장
- 업로드 이력 관리

---

## 6. 스트림 재연결 이력 (stream_reconnections)

### 목적
스트림 재연결 이력을 저장합니다. **실시간 모니터링의 재연결 관리에 사용됩니다.**

### 테이블: `stream_reconnections`

| 컬럼명 | 타입 | 제약조건 | 설명 | 프론트 참조 | 필요 이유 |
|--------|------|----------|------|-------------|-----------|
| `id` | INT | PRIMARY KEY AUTO_INCREMENT | 재연결 ID | - | 재연결 고유 식별자 |
| `stream_session_id` | INT | FOREIGN KEY(stream_sessions.id) | 스트림 세션 ID | - | 어떤 스트림 세션인지 추적 |
| `reconnect_attempt` | TINYINT | NOT NULL | 재연결 시도 횟수 | `LiveMonitoring` reconnectAttempts | 재연결 시도 횟수 추적 |
| `reconnect_reason` | VARCHAR(255) | NULL | 재연결 사유 | - | 재연결 발생 원인 추적 |
| `reconnected_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 재연결 시간 | - | 재연결 시점 추적 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 | - | 데이터 생성 시점 추적 |

### 필요 이유
- 스트림 재연결 이력 추적
- 재연결 문제 분석
- 스트림 안정성 모니터링

---

## 관계도 요약

```
cameras (1) ──< (N) videos
cameras (1) ──< (1) camera_settings
cameras (1) ──< (N) stream_sessions
videos (1) ──< (N) video_uploads
videos (1) ──< (N) stream_sessions
stream_sessions (1) ──< (N) stream_reconnections
```

---

## 데이터 생성 시점

1. **카메라 등록 시**: 
   - `cameras` 생성
   - `camera_settings` 생성 (기본 설정)

2. **비디오 업로드 시**: 
   - `videos` 생성
   - `video_uploads` 생성

3. **스트림 시작 시**: 
   - `stream_sessions` 생성

4. **스트림 재연결 시**: 
   - `stream_reconnections` 생성

5. **카메라 설정 변경 시**: 
   - `camera_settings` 업데이트

---

## 참고사항

- 모든 날짜/시간 컬럼은 한국 시간대(KST) 기준으로 저장
- 스트림 세션은 활성 상태일 때만 조회되도록 인덱스 최적화
- 비디오 파일 삭제 정책: `storage_days` 설정에 따라 자동 삭제
- 스트림 세션은 중지 후 일정 기간 후 자동 삭제 고려

