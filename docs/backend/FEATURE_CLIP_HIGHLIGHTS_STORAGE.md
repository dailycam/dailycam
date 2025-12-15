# 하이라이트 클립 저장 시스템 기술 문서

> 📅 **작성일**: 2025-12-09  
> 📝 **버전**: 1.0  
> 🎯 **목적**: 비디오 분석 결과를 클립/하이라이트로 자동 생성 및 저장하는 시스템 설명

---

## 📋 목차

1. [개요](#개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [데이터베이스 모델](#데이터베이스-모델)
4. [클립 생성 프로세스](#클립-생성-프로세스)
5. [FFmpeg 기반 영상 처리](#ffmpeg-기반-영상-처리)
6. [API 엔드포인트](#api-엔드포인트)
7. [프론트엔드 통합](#프론트엔드-통합)
8. [파일 저장 구조](#파일-저장-구조)
9. [중복 방지 및 최적화](#중복-방지-및-최적화)
10. [문제 해결](#문제-해결)

---

## 개요

### 시스템 목적

dailycam 프로젝트는 실시간 라이브 스트림에서 중요한 순간을 자동으로 감지하고, 이를 짧은 클립으로 생성하여 부모가 쉽게 확인할 수 있도록 합니다.

### 핵심 기능

- ✅ **자동 클립 생성**: 10분 세그먼트 분석 완료 시 자동 생성
- ✅ **이벤트 필터링**: 중요한 이벤트만 선별 (안전: 위험/사고, 발달: 최초발견/다음단계)
- ✅ **FFmpeg 기반**: 실제 영상 자르기 및 썸네일 생성
- ✅ **중복 방지**: 동일 이벤트 중복 생성 방지
- ✅ **날짜별 조회**: KST 기준 날짜별 클립 필터링
- ✅ **다운로드 지원**: 개별 클립 다운로드 기능

---

## 시스템 아키텍처

### 전체 흐름

```
┌─────────────────────┐
│  라이브 스트림 시작   │
│  (HLS/RTSP)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 10분 세그먼트 분석   │
│ (Gemini VLM)       │
│ - 안전 이벤트       │
│ - 발달 마일스톤      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  이벤트 필터링       │
│ - 안전: 위험/사고    │
│ - 발달: 최초/다음단계 │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 하이라이트 클립 생성  │
│ (HighlightClipService)│
│ - FFmpeg 영상 자르기 │
│ - 썸네일 생성        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   DB 저장           │
│ (highlight_clip)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 프론트엔드 표시      │
│ (ClipHighlights.tsx)│
│ - 날짜별 필터링      │
│ - 재생/다운로드      │
└─────────────────────┘
```

### 관련 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|---------|------|------|
| **HighlightClip** | `backend/app/models/clip.py` | DB 모델 |
| **HighlightClipService** | `backend/app/services/highlight_clip_service.py` | 클립 생성 서비스 |
| **ClipGenerator** | `backend/app/services/clip_generator.py` | 간소화 버전 (아카이브 직접 사용) |
| **router** | `backend/app/api/clips/router.py` | API 엔드포인트 |
| **ClipHighlights** | `frontend/src/pages/ClipHighlights.tsx` | UI 페이지 |

---

## 데이터베이스 모델

### HighlightClip 테이블

```python
class ClipCategory(str, enum.Enum):
    """클립 대분류"""
    DEVELOPMENT = "발달"
    SAFETY = "안전"


class HighlightClip(Base):
    """하이라이트 클립 모델"""
    __tablename__ = "highlight_clip"
    
    # 기본 필드
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    video_url = Column(String(512), nullable=False)
    thumbnail_url = Column(String(512), nullable=True)
    category = Column(Enum(ClipCategory), nullable=False)
    
    # 메타데이터
    sub_category = Column(String(100), nullable=True)
    importance = Column(String(20), nullable=True)  # "high", "medium", "low"
    duration_seconds = Column(Integer, nullable=True)
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 관계
    analysis_log_id = Column(Integer, ForeignKey("analysis_log.id"), nullable=True, index=True)
```

### 필드 설명

| 필드 | 타입 | 설명 | 예시 |
|-----|------|------|------|
| `title` | String(255) | 클립 제목 | "[안전] 주방 접근 위험" |
| `description` | Text | 상세 설명 | "아이가 주방에 접근하여 위험한 상황이 발생했습니다" |
| `video_url` | String(512) | 영상 경로 | "/videos/highlights/highlight_safety_20251209_143022_a1b2c3.mp4" |
| `thumbnail_url` | String(512) | 썸네일 경로 | "/videos/highlights/thumbnails/highlight_safety_20251209_143022_a1b2c3.jpg" |
| `category` | Enum | 대분류 | "발달" / "안전" |
| `sub_category` | String(100) | 소분류 | "운동 발달", "주방 접근" |
| `importance` | String(20) | 중요도 | "high", "medium", "low" |
| `duration_seconds` | Integer | 클립 길이(초) | 12 ~ 30 |
| `created_at` | DateTime(TZ) | 생성 시각(UTC) | 2025-12-09T05:30:22Z |

---

## 클립 생성 프로세스

### 1. 트리거: 세그먼트 분석 완료

10분 단위 세그먼트 분석(`SegmentAnalysis`)이 완료되면 자동으로 클립 생성이 시작됩니다.

```python
# backend/app/services/live_monitoring/segment_analyzer.py
async def _analyze_segment_task(camera_id: str, segment_id: int):
    # ... 분석 완료 후 ...
    
    # 하이라이트 클립 생성
    clip_service = HighlightClipService(camera_id=camera_id)
    clips = clip_service.create_clips_from_segment_analysis(
        segment_analysis=segment,
        db=db
    )
```

### 2. 이벤트 필터링

#### 안전 이벤트

**조건**: `severity`가 `'위험'` 또는 `'사고'`인 이벤트만

```python
for event in segment_analysis.safety_incidents:
    severity = event.get('severity', '').lower()
    if severity in ['위험', '사고', 'danger', 'accident']:
        # 클립 생성 대상
```

#### 발달 이벤트

**조건**: `최초발생=True` 또는 `다음단계징후=True`인 이벤트만

```python
for milestone in segment_analysis.development_milestones:
    is_first = milestone.get('최초발생', False)
    has_next_sign = milestone.get('다음단계징후', False)
    
    if is_first or has_next_sign:
        # 클립 생성 대상
```

### 3. 이벤트 병합

**규칙**: 15초 이내 발생한 이벤트는 하나의 클립으로 병합

```python
# 이벤트 병합 (15초 이내)
merged_events = []
current_group = None

for event in all_events:
    if current_group is None:
        current_group = {'events': [event], 'start_offset': event['timestamp_offset']}
    else:
        if event['timestamp_offset'] - current_group['end_offset'] <= 15:
            current_group['events'].append(event)  # 병합
        else:
            merged_events.append(current_group)
            current_group = {'events': [event]}  # 새 그룹 시작
```

### 4. 클립 길이 결정

**규칙**: 이벤트 범위에 따라 12~30초로 자동 조정

```python
span = group['end_offset'] - group['start_offset']

if span <= 5:
    duration = 12  # 짧은 이벤트: 12초
elif span <= 15:
    duration = min(20, span + 10)  # 중간 이벤트: 최대 20초
else:
    duration = min(30, span + 10)  # 긴 이벤트: 최대 30초
```

### 5. 제목 및 설명 생성

#### 단일 이벤트

```python
# 안전 이벤트
title = "[안전] 주방 접근 위험"
sub_category = "🚨 위험 등급 안전 이벤트가 감지되었습니다"

# 발달 이벤트 (최초)
title = "[발달] [최초 발견] 배밀이 성공"
sub_category = "🎉 아이의 새로운 발달 행동이 처음 관찰되었습니다"
```

#### 복합 이벤트

```python
# 안전 + 발달 복합
title = "[복합] 이벤트 (3건)"
sub_category = "⚠️ 안전 이벤트 2건과 발달 이벤트 1건이 동시에 발생했습니다"
```

---

## FFmpeg 기반 영상 처리

### 클립 추출

#### 명령어 구성

```python
command = [
    "ffmpeg",
    "-y",                          # 덮어쓰기 허용
    "-ss", str(start_time),        # 시작 시간 (초)
    "-i", str(source_path),        # 입력 파일
    "-t", str(duration),           # 클립 길이 (초)
    "-c:v", "libx264",             # 비디오 코덱
    "-preset", "fast",             # 인코딩 속도
    "-crf", "23",                  # 품질 (18~28, 23=권장)
    "-c:a", "aac",                 # 오디오 코덱
    "-b:a", "128k",                # 오디오 비트레이트
    "-movflags", "+faststart",     # 웹 재생 최적화
    str(output_path)
]
```

#### 옵션 설명

| 옵션 | 값 | 설명 |
|-----|-----|------|
| `-preset` | `fast` | 인코딩 속도 (ultrafast, fast, medium, slow) |
| `-crf` | `23` | 품질 (낮을수록 고품질, 18~28 권장) |
| `-movflags` | `+faststart` | 메타데이터를 파일 앞쪽으로 이동 (웹 재생 최적화) |

### 썸네일 생성

#### 명령어 구성

```python
command = [
    "ffmpeg",
    "-y",
    "-ss", str(timestamp),         # 추출 시점 (클립 중간)
    "-i", str(video_path),         # 입력 비디오
    "-vframes", "1",               # 1프레임만 추출
    "-q:v", "2",                   # JPEG 품질 (2~31, 2=최고)
    "-vf", "scale=640:-1",         # 가로 640px로 리사이즈
    str(thumbnail_path)
]
```

### FFmpeg 경로 찾기

```python
def _find_ffmpeg(self):
    """FFmpeg 실행 파일 경로 자동 감지"""
    
    # 1. Docker 환경
    if os.path.exists('/.dockerenv'):
        return shutil.which('ffmpeg')
    
    # 2. Windows - 프로젝트 내부 bin
    if platform.system() == 'Windows':
        local_ffmpeg = self.backend_dir / "bin" / "ffmpeg.exe"
        if local_ffmpeg.exists():
            return str(local_ffmpeg)
    
    # 3. PATH 환경변수
    return shutil.which('ffmpeg') or 'ffmpeg'
```

---

## API 엔드포인트

### 1. 클립 목록 조회

```http
GET /api/clips/list?category={category}&limit={limit}&target_date={date}
```

**파라미터**:
- `category` (optional): `"all"` | `"안전"` | `"발달"`
- `limit` (optional): 최대 클립 수 (기본값: 20)
- `target_date` (optional): 날짜 필터 (형식: `YYYY-MM-DD`)

**응답**:
```json
{
  "total": 5,
  "clips": [
    {
      "id": 123,
      "title": "[안전] 주방 접근 위험",
      "description": "아이가 주방에 접근하여...",
      "video_url": "/videos/highlights/highlight_safety_20251209_143022_a1b2c3.mp4",
      "thumbnail_url": "/videos/highlights/thumbnails/highlight_safety_20251209_143022_a1b2c3.jpg",
      "download_url": "/api/clips/download/123",
      "category": "안전",
      "sub_category": "주방 접근",
      "importance": "high",
      "duration_seconds": 15,
      "created_at": "2025-12-09T14:30:22+09:00"
    }
  ]
}
```

**특징**:
- UTC → KST 자동 변환
- 날짜 필터링 시 KST 기준 00:00:00 ~ 23:59:59
- 생성일시 내림차순 정렬

### 2. 클립 다운로드

```http
GET /api/clips/download/{clip_id}
```

**응답**:
- Content-Type: `video/mp4`
- Content-Disposition: `attachment; filename="[안전]_주방_접근_위험_123.mp4"`

### 3. 클립 삭제

```http
DELETE /api/clips/{clip_id}
```

**동작**:
1. DB에서 클립 정보 조회
2. 비디오 파일 삭제 (`video_url`)
3. 썸네일 파일 삭제 (`thumbnail_url`)
4. DB 레코드 삭제

### 4. 중복 클립 제거

```http
POST /api/clips/remove-duplicates
```

**조건**: 제목, 설명, 생성시간(분 단위)이 동일한 클립

**응답**:
```json
{
  "message": "3개의 중복 클립 삭제 완료",
  "deleted_count": 3,
  "remaining_count": 15
}
```

### 5. 테스트 클립 생성

```http
GET /api/clips/test-create
```

**동작**:
- 아카이브 디렉토리에서 가장 최근 완성된 영상 선택
- 10초~40초 구간 30초 클립 생성

---

## 프론트엔드 통합

### ClipHighlights.tsx

#### 주요 기능

```typescript
// 1. 날짜 선택 (최근 7일)
const [selectedDate, setSelectedDate] = useState<Date>(new Date())
const [availableDates, setAvailableDates] = useState<Date[]>([])

// 2. 탭 전환 (발달/안전)
const [activeTab, setActiveTab] = useState<'development' | 'safety'>('development')

// 3. 클립 데이터 로드
useEffect(() => {
  const fetchClips = async () => {
    const targetDate = selectedDate.toISOString().split('T')[0]
    const response = await getClipHighlights('all', 50, targetDate)
    
    const devClips = response.clips.filter(clip => clip.category === '발달')
    const safeClips = response.clips.filter(clip => clip.category === '안전')
    
    setDevelopmentClips(devClips)
    setSafetyClips(safeClips)
  }
  
  fetchClips()
}, [selectedDate])
```

#### 클립 재생

```typescript
const [selectedClip, setSelectedClip] = useState<string | null>(null)

// 비디오 모달 열기
const handlePlayClip = (videoUrl: string) => {
  setSelectedClip(`${API_BASE_URL}${videoUrl}`)
}
```

#### 클립 다운로드

```typescript
const handleDownload = async (clip: HighlightClip) => {
  const videoUrl = `${API_BASE_URL}${clip.video_url}`
  
  const a = document.createElement('a')
  a.href = videoUrl
  a.download = `${clip.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${clip.id}.mp4`
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
```

#### 클립 삭제

```typescript
const handleDelete = async (clip: HighlightClip) => {
  if (!confirm(`"${clip.title}" 클립을 삭제하시겠습니까?`)) return
  
  await deleteClip(clip.id)
  
  // 목록 새로고침
  const targetDate = selectedDate.toISOString().split('T')[0]
  const response = await getClipHighlights('all', 50, targetDate)
  // ...
}
```

---

## 파일 저장 구조

### 디렉토리 구조

```
backend/
├── videos/
│   └── highlights/                # 하이라이트 클립 저장소
│       ├── highlight_safety_20251209_143022_a1b2c3.mp4
│       ├── highlight_dev_20251209_145530_d4e5f6.mp4
│       └── thumbnails/            # 썸네일 저장소
│           ├── highlight_safety_20251209_143022_a1b2c3.jpg
│           └── highlight_dev_20251209_145530_d4e5f6.jpg
│
└── temp_videos/
    └── hls_buffer/
        └── camera-1/
            └── archive/           # 원본 영상 (10분 세그먼트)
                ├── archive_20251209_140000.mp4
                ├── archive_20251209_141000.mp4
                └── thumbnails/
```

### 파일명 규칙

#### 클립 파일

```
highlight_{category}_{timestamp}_{uuid}.mp4
```

- `category`: `safety` | `dev`
- `timestamp`: `YYYYMMDD_HHMMSS`
- `uuid`: 12자리 랜덤 문자열

**예시**:
- `highlight_safety_20251209_143022_a1b2c3d4e5f6.mp4`
- `highlight_dev_20251209_145530_123abc456def.mp4`

#### 썸네일 파일

클립 파일명에서 확장자만 `.jpg`로 변경

```
highlight_safety_20251209_143022_a1b2c3d4e5f6.jpg
```

### 정적 파일 서빙

#### FastAPI 설정

```python
# backend/app/main.py
from fastapi.staticfiles import StaticFiles

app.mount("/videos", StaticFiles(directory="videos"), name="videos")
app.mount("/temp_videos", StaticFiles(directory="temp_videos"), name="temp_videos")
```

#### URL 매핑

| 파일 경로 | URL |
|----------|-----|
| `backend/videos/highlights/clip.mp4` | `http://localhost:8000/videos/highlights/clip.mp4` |
| `backend/videos/highlights/thumbnails/clip.jpg` | `http://localhost:8000/videos/highlights/thumbnails/clip.jpg` |

---

## 중복 방지 및 최적화

### 1. 중복 클립 방지

#### 방법: 5분 이내 동일 제목/설명 체크

```python
# 중복 체크
five_minutes_ago = datetime.now() - timedelta(minutes=5)

existing_clip = db.query(HighlightClip).filter(
    HighlightClip.title == title,
    HighlightClip.description == description,
    HighlightClip.created_at >= five_minutes_ago
).first()

if existing_clip:
    print(f"⚠️ 중복 클립 감지, 생성 스킵: {title}")
    return {"clip_id": existing_clip.id, "duplicate": True}
```

### 2. 이벤트 병합

#### 방법: 15초 이내 이벤트 그룹화

```python
# 15초 이내 이벤트는 하나의 클립으로 병합
if event['timestamp_offset'] - current_group['end_offset'] <= 15:
    current_group['events'].append(event)
else:
    merged_events.append(current_group)
    current_group = {'events': [event]}
```

**장점**:
- 클립 수 감소 (저장 공간 절약)
- 연속된 중요 이벤트를 하나의 맥락으로 제공

### 3. FFmpeg 최적화

#### CRF 값 조정

```python
"-crf", "23"  # 기본값: 23 (권장 범위: 18~28)
```

- **18**: 고품질, 큰 파일 크기
- **23**: 권장 (품질과 크기의 균형)
- **28**: 낮은 품질, 작은 파일 크기

#### 웹 재생 최적화

```python
"-movflags", "+faststart"
```

- 메타데이터를 파일 앞쪽으로 이동
- 전체 다운로드 전에 재생 시작 가능

### 4. 파일 크기 최적화

| 설정 | 값 | 효과 |
|-----|-----|------|
| 비디오 코덱 | libx264 | 널리 지원, 압축률 우수 |
| 인코딩 속도 | fast | 빠른 인코딩 (실시간 처리) |
| 품질 | CRF 23 | 5~10MB / 30초 클립 |
| 오디오 비트레이트 | 128k | 충분한 음질 |

---

## 문제 해결

### 1. FFmpeg 실행 오류

#### 증상

```
[하이라이트] ❌ 클립 생성 오류: FileNotFoundError: ffmpeg not found
```

#### 해결

1. **Windows**: `backend/bin/ffmpeg.exe` 배치
2. **Linux/Docker**: `apt-get install ffmpeg`
3. **PATH 환경변수 확인**:
   ```bash
   which ffmpeg  # Linux/Mac
   where ffmpeg  # Windows
   ```

### 2. 원본 영상 없음

#### 증상

```
[하이라이트] ❌ 원본 파일 없음: temp_videos/hls_buffer/camera-1/archive/archive_20251209_140000.mp4
```

#### 원인

- HLS 스트림이 아직 10분 세그먼트를 완성하지 못함
- 아카이브 파일이 이미 삭제됨

#### 해결

1. HLS 스트림이 최소 10분 이상 실행되었는지 확인
2. 아카이브 보관 정책 확인 (자동 삭제 시간)

### 3. 썸네일 생성 실패

#### 증상

```
[하이라이트] ⚠️ 썸네일 생성 오류
```

#### 원인

- 비디오 파일이 손상됨
- FFmpeg 타임아웃

#### 해결

1. 클립 파일 재생 가능 여부 확인
2. 썸네일 타임스탬프 조정 (`duration / 2`)

### 4. 중복 클립 대량 생성

#### 증상

동일한 이벤트에 대해 클립이 여러 개 생성됨

#### 해결

```bash
# 중복 제거 API 호출
curl -X POST http://localhost:8000/api/clips/remove-duplicates
```

또는 DB 직접 정리:

```sql
DELETE t1 FROM highlight_clip t1
INNER JOIN highlight_clip t2
WHERE t1.id > t2.id
  AND t1.title = t2.title
  AND t1.description = t2.description
  AND TIMESTAMPDIFF(MINUTE, t2.created_at, t1.created_at) <= 5;
```

### 5. 날짜별 조회 오류

#### 증상

특정 날짜의 클립이 표시되지 않음

#### 원인

타임존 불일치 (UTC vs KST)

#### 해결

- DB는 UTC로 저장
- API는 자동으로 KST ↔ UTC 변환
- 프론트엔드는 KST 날짜만 전달 (`YYYY-MM-DD`)

---

## 성능 고려사항

### 1. 클립 생성 시간

| 클립 길이 | 예상 소요 시간 | 병목 구간 |
|----------|--------------|----------|
| 12초 | ~2초 | FFmpeg 인코딩 |
| 20초 | ~3초 | FFmpeg 인코딩 |
| 30초 | ~5초 | FFmpeg 인코딩 + 썸네일 |

### 2. 동시 생성 제한

```python
# 현재: 순차 처리
for group in merged_events:
    result = self.create_highlight_clip(...)
    clips_created.append(result)

# 개선: 병렬 처리 (향후)
import asyncio
tasks = [create_clip_async(group) for group in merged_events]
clips_created = await asyncio.gather(*tasks)
```

### 3. 저장 공간 관리

| 항목 | 크기 | 보관 기간 |
|-----|------|----------|
| 클립 (30초) | ~10MB | 30일 (설정 가능) |
| 썸네일 | ~100KB | 클립과 동일 |
| 원본 세그먼트 | ~200MB/10분 | 7일 → 삭제 |

**자동 정리 스크립트 예시** (향후 구현):

```python
# 30일 이상 오래된 클립 삭제
thirty_days_ago = datetime.now() - timedelta(days=30)
old_clips = db.query(HighlightClip).filter(
    HighlightClip.created_at < thirty_days_ago
).all()

for clip in old_clips:
    # 파일 삭제
    Path(clip.video_url).unlink(missing_ok=True)
    Path(clip.thumbnail_url).unlink(missing_ok=True)
    # DB 삭제
    db.delete(clip)
db.commit()
```

---

## 향후 개선 사항

### 1. 클립 생성 병렬화

- 현재: 순차 처리
- 개선: asyncio를 이용한 병렬 FFmpeg 실행
- 효과: 생성 시간 50% 단축

### 2. 클라우드 스토리지 통합

- 현재: 로컬 파일 시스템
- 개선: AWS S3, GCS 등
- 효과: 확장성, 안정성 향상

### 3. 스마트 썸네일 선택

- 현재: 클립 중간 프레임
- 개선: AI 기반 가장 의미 있는 프레임 선택
- 효과: 사용자 경험 향상

### 4. 클립 공유 기능

- URL 기반 클립 공유
- 소셜 미디어 통합
- 임베드 코드 생성

### 5. 사용자 피드백 수집

- 클립 유용도 평가 (👍 / 👎)
- 자동 필터링 정확도 향상
- 개인화된 중요도 학습

---

## 참고 자료

### 관련 문서

- [FEATURE_HIGHLIGHT_CLIPS_2025_12_05.md](./FEATURE_HIGHLIGHT_CLIPS_2025_12_05.md)
- [LIVE_STREAMING_ARCHITECTURE.md](./LIVE_STREAMING_ARCHITECTURE.md)
- [VLM_ANALYSIS_IMPROVEMENTS.md](./VLM_ANALYSIS_IMPROVEMENTS.md)

### 코드 위치

- **모델**: `backend/app/models/clip.py`
- **서비스**: `backend/app/services/highlight_clip_service.py`
- **API**: `backend/app/api/clips/router.py`
- **UI**: `frontend/src/pages/ClipHighlights.tsx`

### 외부 라이브러리

- [FFmpeg](https://ffmpeg.org/) - 영상 처리
- [SQLAlchemy](https://www.sqlalchemy.org/) - ORM
- [FastAPI](https://fastapi.tiangolo.com/) - 백엔드 프레임워크

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-09 | 1.0 | 초기 문서 작성 |

---

**문서 작성자**: AI Assistant  
**검토자**: -  
**최종 수정일**: 2025-12-09

