# 클립 하이라이트 기능 사용 가이드

## 📹 개요

HLS 라이브 스트리밍에서 자동으로 하이라이트 클립을 생성하는 기능입니다.
- **안전 이벤트**: 위험 상황, 주의 필요 상황
- **발달 마일스톤**: 첫 걸음, 새로운 행동 등

## 🚀 사용 방법

### 1. 자동 클립 생성 (권장)

10분 단위 분석이 완료되면 자동으로 클립이 생성됩니다.

```python
# backend/app/services/live_monitoring/segment_analyzer.py
# 분석 완료 후 클립 생성 로직 추가 필요
```

### 2. 수동 클립 생성

#### API 호출
```bash
# 최근 분석 결과에서 클립 생성
POST http://localhost:8000/api/clips/generate/camera-1

# 특정 분석 결과에서 클립 생성
POST http://localhost:8000/api/clips/generate/camera-1?segment_analysis_id=123
```

#### 프론트엔드에서 호출
```typescript
import { generateClipsFromAnalysis } from '../lib/api'

// 최근 분석에서 클립 생성
const result = await generateClipsFromAnalysis('camera-1')

// 특정 분석에서 클립 생성
const result = await generateClipsFromAnalysis('camera-1', 123)
```

### 3. 클립 조회

```typescript
import { getClipHighlights } from '../lib/api'

// 모든 클립 조회
const clips = await getClipHighlights('all', 20)

// 안전 클립만 조회
const safetyClips = await getClipHighlights('안전', 20)

// 발달 클립만 조회
const devClips = await getClipHighlights('발달', 20)
```

### 4. 클립 삭제

```typescript
import { deleteClip } from '../lib/api'

await deleteClip(clipId)
```

## 📂 생성되는 파일 구조

```
videos/
└── clips/
    └── camera-1/
        ├── clip_safety_20251206_172244_0.mp4
        ├── clip_dev_20251206_172244_1.mp4
        └── thumbnails/
            ├── clip_safety_20251206_172244_0.jpg
            └── clip_dev_20251206_172244_1.jpg
```

## 🎯 클립 생성 조건

### 안전 이벤트 클립
- **심각도**: `위험`, `주의`, `danger`, `warning`
- **길이**: 30초 (이벤트 전후 15초씩)
- **중요도**: 
  - `위험`/`danger` → `high`
  - `주의`/`warning` → `medium`

### 발달 마일스톤 클립
- **중요도**: `높음`, `중간`, `high`, `medium`
- **길이**: 30초 (이벤트 전후 15초씩)

## 🔧 설정

### FFmpeg 경로 설정

클립 생성에는 FFmpeg가 필요합니다.

#### Windows
```bash
# 1. FFmpeg 다운로드
https://www.gyan.dev/ffmpeg/builds/

# 2. 압축 해제 후 PATH에 추가
# 또는 backend/bin/ 폴더에 ffmpeg.exe 복사

# 3. 환경 변수 설정 (선택사항)
set FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
```

#### Docker
```dockerfile
# Dockerfile에 FFmpeg 설치
RUN apt-get update && apt-get install -y ffmpeg
```

## 📊 데이터베이스 스키마

```python
class HighlightClip(Base):
    __tablename__ = "highlight_clip"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(255))  # "배밀이 2미터 이동 성공!"
    description = Column(Text)
    video_url = Column(String(512))  # "/videos/clips/camera-1/clip_xxx.mp4"
    thumbnail_url = Column(String(512))  # "/videos/clips/camera-1/thumbnails/clip_xxx.jpg"
    category = Column(Enum(ClipCategory))  # "발달", "안전"
    sub_category = Column(String(100))  # "운동 발달", "주방 접근"
    importance = Column(String(20))  # "high", "medium", "low"
    duration_seconds = Column(Integer)  # 30
    created_at = Column(DateTime)
```

## 🎨 프론트엔드 통합

### ClipHighlights 페이지에서 사용

```typescript
// src/pages/ClipHighlights.tsx
import { getClipHighlights, generateClipsFromAnalysis, deleteClip } from '../lib/api'

function ClipHighlights() {
  const [clips, setClips] = useState([])
  
  // 클립 로드
  useEffect(() => {
    async function loadClips() {
      const data = await getClipHighlights('all', 20)
      setClips(data.clips)
    }
    loadClips()
  }, [])
  
  // 클립 생성 버튼
  const handleGenerateClips = async () => {
    await generateClipsFromAnalysis('camera-1')
    // 클립 목록 새로고침
    const data = await getClipHighlights('all', 20)
    setClips(data.clips)
  }
  
  return (
    <div>
      <button onClick={handleGenerateClips}>
        최근 분석에서 클립 생성
      </button>
      
      {clips.map(clip => (
        <ClipCard key={clip.id} clip={clip} />
      ))}
    </div>
  )
}
```

## 🐛 트러블슈팅

### 클립이 생성되지 않음
1. **FFmpeg 설치 확인**
   ```bash
   ffmpeg -version
   ```

2. **원본 영상 파일 확인**
   ```
   temp_videos/hls_buffer/camera-1/archive/
   ```

3. **분석 결과 확인**
   - 세그먼트 분석이 완료되었는지 확인
   - `safety_incidents` 또는 `development_milestones`에 데이터가 있는지 확인

### 썸네일이 생성되지 않음
- FFmpeg 로그 확인
- 비디오 파일이 손상되지 않았는지 확인

### 클립 재생이 안됨
- 웹 서버에서 `/videos/clips` 경로가 제공되는지 확인
- `main.py`에 StaticFiles 마운트 확인:
  ```python
  app.mount("/videos", StaticFiles(directory="videos"), name="videos")
  ```

## 📝 TODO

- [ ] 자동 클립 생성 스케줄러 통합
- [ ] 클립 길이 커스터마이징
- [ ] 클립 편집 기능 (자르기, 합치기)
- [ ] 클립 공유 기능
- [ ] 클립 다운로드 기능
