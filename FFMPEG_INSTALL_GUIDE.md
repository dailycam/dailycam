# FFmpeg 설치 가이드 (Windows)

## 현재 상황

HLS 스트리밍을 위해서는 **FFmpeg**가 필요합니다.
현재 FFmpeg가 설치되지 않아서 스트림이 작동하지 않습니다.

## 해결 방법

### 방법 1: 직접 다운로드 및 설치 (권장)

#### 1단계: FFmpeg 다운로드
1. https://www.gyan.dev/ffmpeg/builds/ 접속
2. "ffmpeg-release-essentials.zip" 다운로드 (약 70MB)

#### 2단계: 압축 해제
1. 다운로드한 ZIP 파일을 `C:\ffmpeg`에 압축 해제
2. 최종 경로: `C:\ffmpeg\bin\ffmpeg.exe`

#### 3단계: PATH 환경 변수에 추가
1. Windows 검색에서 "환경 변수" 입력
2. "시스템 환경 변수 편집" 클릭
3. "환경 변수" 버튼 클릭
4. "시스템 변수" 섹션에서 "Path" 선택 후 "편집" 클릭
5. "새로 만들기" 클릭
6. `C:\ffmpeg\bin` 입력
7. "확인" 클릭하여 모든 창 닫기

#### 4단계: 설치 확인
새 PowerShell 또는 CMD 창을 열고:
```bash
ffmpeg -version
```

성공하면 FFmpeg 버전 정보가 출력됩니다.

### 방법 2: Chocolatey 사용 (간편)

Chocolatey가 설치되어 있다면:
```bash
choco install ffmpeg
```

### 방법 3: Scoop 사용
```bash
scoop install ffmpeg
```

## 설치 후 작업

### 1. 백엔드 재시작
```bash
# 기존 백엔드 종료 (Ctrl+C)
cd backend
python run.py
```

### 2. 프론트엔드 설정 변경
`frontend/src/pages/Monitoring.tsx` 파일에서:
```typescript
// 현재 (FFmpeg 없음)
const [useHLS] = useState(false)

// FFmpeg 설치 후
const [useHLS] = useState(true)
```

### 3. 프론트엔드 재시작
```bash
# 기존 프론트엔드 종료 (Ctrl+C)
cd frontend
npm run dev
```

## 임시 해결책: MJPEG 방식 사용

FFmpeg 설치 전까지는 **기존 MJPEG 방식**을 사용할 수 있습니다.

### 현재 설정 (이미 적용됨)
- 프론트엔드에서 `useHLS = false`로 설정됨
- "스트림 시작" 버튼 클릭 시 MJPEG 방식으로 작동

### MJPEG 방식 테스트
1. 모니터링 페이지에서 "스트림 시작" 버튼 클릭
2. 영상이 재생되는지 확인
3. ✅ 작동하면 FFmpeg 없이도 사용 가능
4. ❌ 작동하지 않으면 다른 페이지로 이동 후 복귀 시 영상이 처음부터 재생됨

## HLS vs MJPEG 비교

| 기능 | MJPEG (현재) | HLS (FFmpeg 필요) |
|------|-------------|------------------|
| 설치 필요 | ❌ 없음 | ✅ FFmpeg 필요 |
| 이어서 재생 | ❌ 처음부터 | ✅ 현재 시간부터 |
| 백그라운드 실행 | ❌ | ✅ |
| 성능 | 보통 | 우수 |
| 홈캠 연동 | 가능 | 가능 |

## 문제 해결

### "ffmpeg를 찾을 수 없습니다" 오류
- PATH 환경 변수가 제대로 설정되지 않음
- PowerShell/CMD를 **재시작**해야 PATH 변경사항이 적용됨
- 컴퓨터 재부팅 권장

### 백엔드 로그 확인
```
[HLS 스트림] ✅ FFmpeg 경로: C:\ffmpeg\bin\ffmpeg.exe
[HLS 스트림] ✅ FFmpeg 프로세스 시작 성공
```
위 메시지가 보이면 성공!

## 추천 방법

1. **지금 당장 테스트하고 싶다면**: MJPEG 방식 사용 (이미 설정됨)
2. **완전한 기능을 원한다면**: FFmpeg 설치 (10분 소요)

FFmpeg 설치 후 HLS 스트리밍을 사용하면:
- ✅ 다른 페이지로 이동해도 영상이 계속 재생
- ✅ 돌아왔을 때 이어서 재생
- ✅ 실제 홈캠 연동 시에도 동일하게 작동

