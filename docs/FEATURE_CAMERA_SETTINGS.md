# 카메라 설정 기능 구현

## 개요

사용자가 설정 페이지에서 카메라에 재생할 영상을 업로드하고 관리할 수 있는 기능을 구현했습니다. 업로드한 영상은 자동으로 순환 재생되며, 영상이 없으면 기본 샘플 영상이 재생됩니다.

## 주요 기능

### 1. 영상 업로드
- 사용자가 MP4, MOV, AVI 등의 비디오 파일을 업로드
- 최대 500MB까지 지원
- 파일명에 타임스탬프 자동 추가 (중복 방지)
- 영상 길이 자동 추출 (OpenCV 사용)

### 2. 영상 관리
- 업로드된 영상 목록 조회
- 영상 삭제 기능
- 영상 파일 크기 및 길이 표시
- 카메라별 개별 관리 (camera-1, camera-2, camera-3)

### 3. 자동 스트림 재생
- **⚠️ 사용자 업로드 영상만 재생** (샘플 영상 사용 안 함)
- 영상이 없으면 스트림이 시작되지 않음
- 업로드한 영상들을 순환 재생 (루프)
- 스트림 방식 유지 (기존 가짜 스트림 로직 활용)

## 구현 상세

### 백엔드

#### 1. 데이터베이스 모델 (`backend/app/models/camera_setting.py`)

```python
class CameraSetting(Base):
    """사용자별 카메라 설정"""
    id: int (PK)
    user_id: int (FK -> users.id)
    camera_id: str (예: "camera-1")
    camera_name: str (사용자 지정 이름)
    is_active: bool
    created_at: datetime
    updated_at: datetime

class CameraVideo(Base):
    """카메라에 업로드된 영상 파일"""
    id: int (PK)
    camera_setting_id: int (FK -> camera_settings.id)
    filename: str
    file_path: str
    file_size: int (bytes)
    duration: int (seconds)
    is_active: bool
    order_index: int
    uploaded_at: datetime
```

#### 2. API 엔드포인트 (`backend/app/api/camera_settings/router.py`)

- `GET /api/camera-settings/cameras` - 카메라 설정 목록 조회
- `POST /api/camera-settings/cameras` - 새 카메라 생성
- `POST /api/camera-settings/cameras/{camera_id}/upload-video` - 영상 업로드
- `DELETE /api/camera-settings/videos/{video_id}` - 영상 삭제
- `PATCH /api/camera-settings/videos/{video_id}/toggle` - 영상 활성화/비활성화
- `PATCH /api/camera-settings/cameras/{camera_id}/reorder` - 영상 순서 변경

#### 3. 스트림 로직 수정 (`backend/app/services/live_monitoring/video_queue.py`)

**변경 내용:**
- `VideoQueue.__init__()`: `user_id` 매개변수 추가
- `VideoQueue.load_videos()`: 사용자 업로드 영상 우선 로드
  - `user_uploaded_*.mp4` 파일을 먼저 검색
  - 있으면 해당 영상만 사용
  - 없으면 기본 샘플 영상 사용

```python
# 1. 사용자 업로드 영상 우선 로드
user_uploaded_videos = list(self.video_dir.glob("user_uploaded_*.mp4"))

if user_uploaded_videos:
    # 사용자 영상만 사용
    self.current_queue.extend(user_uploaded_videos)
else:
    # 기본 샘플 영상 사용
    short_clips = list(self.short_clips_dir.glob("*.mp4"))
    medium_clips = list(self.medium_clips_dir.glob("*.mp4"))
    ...
```

### 프론트엔드

#### 1. API 클라이언트 (`frontend/src/lib/api.ts`)

새로운 함수들:
- `getUserCameras()` - 카메라 설정 목록 조회
- `uploadCameraVideo()` - 영상 업로드
- `deleteCameraVideo()` - 영상 삭제
- `toggleVideoActive()` - 영상 활성화/비활성화

#### 2. Settings 페이지 (`frontend/src/pages/Settings.tsx`)

**카메라 설정 섹션 추가:**
- 카메라 선택 드롭다운
- 영상 업로드 버튼 및 진행률 표시
- 업로드된 영상 목록
- 영상 삭제 버튼
- 파일 크기 및 길이 표시
- 사용 안내 메시지

```tsx
{activeSection === 'camera' && (
  <div className="card">
    <h2>카메라 스트림 설정</h2>
    
    {/* 카메라 선택 */}
    <select value={selectedCameraId} onChange={...}>
      <option value="camera-1">카메라 1</option>
      ...
    </select>
    
    {/* 영상 업로드 */}
    <input type="file" accept="video/*" onChange={handleVideoUpload} />
    
    {/* 업로드된 영상 목록 */}
    {selectedCamera.videos.map(video => (
      <div key={video.id}>
        <span>{video.filename}</span>
        <button onClick={() => handleVideoDelete(video.id)}>삭제</button>
      </div>
    ))}
  </div>
)}
```

## 파일 구조

```
videos/
├── camera-1/
│   ├── user_uploaded_20241209_123456_video.mp4  # 사용자 업로드 영상 (우선)
│   ├── user_uploaded_20241209_234567_another.mp4
│   ├── short/                                    # 기본 샘플 영상
│   │   ├── sample1.mp4
│   │   └── sample2.mp4
│   └── medium/
│       └── sample_medium.mp4
├── camera-2/
│   └── ...
└── camera-3/
    └── ...
```

## 데이터베이스 마이그레이션

새 테이블 생성 스크립트: `backend/app/commands/db/add_camera_settings_table.sql`

```sql
-- 실행 방법
mysql -u root -p dailycam < backend/app/commands/db/add_camera_settings_table.sql
```

또는 애플리케이션 시작 시 자동으로 생성됩니다 (SQLAlchemy의 `Base.metadata.create_all()`).

## 사용 흐름

1. **사용자**: 설정 페이지 → 카메라 설정 메뉴 접근
2. **사용자**: 카메라 선택 (camera-1, camera-2, camera-3)
3. **사용자**: "영상 선택" 버튼 클릭 → 비디오 파일 선택
4. **시스템**: 파일 업로드 및 DB 저장
5. **시스템**: 영상 정보 추출 (길이, 크기)
6. **사용자**: 업로드된 영상 목록 확인
7. **사용자**: 라이브 모니터링 페이지 접속
8. **시스템**: 사용자 업로드 영상 자동 재생 시작

## 향후 개선 사항

### 우선순위: 높음
- [ ] 영상 재생 순서 변경 (드래그 앤 드롭)
- [ ] 영상 미리보기 썸네일
- [ ] 실제 홈캠 RTSP URL 입력 지원

### 우선순위: 중간
- [ ] 영상 업로드 진행률 실시간 표시
- [ ] 영상 편집 기능 (자르기, 이어붙이기)
- [ ] 여러 영상 일괄 업로드
- [ ] 영상 품질 선택 (해상도, 비트레이트)

### 우선순위: 낮음
- [ ] 영상 공유 기능
- [ ] 영상 태그 및 검색
- [ ] 영상 즐겨찾기

## 테스트 방법

1. **백엔드 시작**:
```bash
cd backend
python run.py
```

2. **프론트엔드 시작**:
```bash
cd frontend
npm run dev
```

3. **테스트 시나리오**:
   - 로그인 후 설정 페이지 접근
   - 카메라 설정 메뉴 클릭
   - 영상 업로드 (작은 MP4 파일 권장)
   - 업로드된 영상 목록 확인
   - 라이브 모니터링 페이지에서 재생 확인
   - 영상 삭제 테스트

## 주의사항

- **⚠️ 영상을 먼저 업로드해야 스트림이 시작됩니다**
- 영상 파일은 `videos/{camera_id}/` 디렉토리에 저장됩니다
- `user_uploaded_` 접두사가 있는 파일만 재생됩니다
- 영상이 없으면 스트림이 시작되지 않으며, 명확한 오류 메시지가 표시됩니다
- 샘플 영상은 더 이상 사용하지 않습니다

## 관련 파일

### 백엔드
- `backend/app/models/camera_setting.py` - 데이터베이스 모델
- `backend/app/api/camera_settings/router.py` - API 라우터
- `backend/app/services/live_monitoring/video_queue.py` - 스트림 로직
- `backend/app/commands/db/add_camera_settings_table.sql` - DB 마이그레이션

### 프론트엔드
- `frontend/src/lib/api.ts` - API 클라이언트
- `frontend/src/pages/Settings.tsx` - 설정 UI

## 구현 일자

2024년 12월 9일

## 작성자

AI Assistant (Claude Sonnet 4.5)

