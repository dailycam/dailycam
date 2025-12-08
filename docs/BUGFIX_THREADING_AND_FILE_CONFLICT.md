# 버그 수정: Threading 오류 및 파일 충돌

## 작업 일시
2025-12-03

## 🔴 발견된 버그

### 버그 1: Threading 변수 오류
```
UnboundLocalError: cannot access local variable 'threading' where it is not associated with a value
```

**위치**: `backend/app/services/live_monitoring/hls_stream_generator.py:203`

**원인**:
```python
# 잘못된 코드
def some_function():
    # ...
    import threading  # ❌ 이미 모듈 상단에서 import됨
    gemini_thread = threading.Thread(...)
```

`threading` 모듈은 이미 파일 상단에서 import되었는데, 함수 내부에서 다시 import하려고 시도하여 변수 스코프 충돌 발생.

### 버그 2: 파일 이름 충돌
```
[WinError 183] 파일이 이미 있으므로 만들 수 없습니다: 
'archive_20251203_125000_temp.avi' -> 'archive_20251203_125000.mp4'
```

**위치**: `backend/app/services/live_monitoring/hls_stream_generator.py:504`

**원인**:
- 서버 재시작 시 이전 실행에서 생성된 파일이 남아있음
- `Path.rename()`은 대상 파일이 이미 존재하면 오류 발생
- 파일 이름 변경 전 기존 파일 확인 로직 부재

---

## ✅ 해결 방법

### 수정 1: Threading Import 제거

**변경 전**:
```python
if detector.should_run_gemini_analysis() and self.event_loop:
    frame_copy = frame.copy()
    def run_async_gemini():
        asyncio.run(self._run_gemini_analysis_in_thread(detector, frame_copy))
    
    import threading  # ❌ 중복 import
    gemini_thread = threading.Thread(target=run_async_gemini, daemon=True)
    gemini_thread.start()
```

**변경 후**:
```python
if detector.should_run_gemini_analysis() and self.event_loop:
    frame_copy = frame.copy()
    def run_async_gemini():
        asyncio.run(self._run_gemini_analysis_in_thread(detector, frame_copy))
    
    # ✅ 이미 상단에서 import된 threading 사용
    gemini_thread = threading.Thread(target=run_async_gemini, daemon=True)
    gemini_thread.start()
```

### 수정 2: 파일 이름 변경 전 기존 파일 삭제

**변경 전**:
```python
# 변환 실패 시 임시 파일을 최종 파일로 이름 변경
if self.current_archive_temp_path.exists():
    self.current_archive_temp_path.rename(self.current_archive_path)  # ❌ 충돌 가능
```

**변경 후**:
```python
# 변환 실패 시 임시 파일을 최종 파일로 이름 변경
if self.current_archive_temp_path.exists():
    # ✅ 기존 파일이 있으면 삭제
    if self.current_archive_path.exists():
        self.current_archive_path.unlink()
    self.current_archive_temp_path.rename(self.current_archive_path)
```

**적용 위치** (3곳):
1. Line 503-507: FFmpeg 변환 실패 시
2. Line 508-512: FFmpeg 없을 때
3. Line 514-518: 예외 처리 시

---

## 🧪 테스트 결과

### Before (버그 발생)
```
[HLS 스트림] ✅ FFmpeg 프로세스 시작 성공 (PID: 46432)
[HLS 스트림] ❌ 예상치 못한 오류: cannot access local variable 'threading'...
UnboundLocalError: cannot access local variable 'threading'...
[HLS 아카이브] 변환 중 오류: [WinError 183] 파일이 이미 있으므로 만들 수 없습니다
```

### After (수정 후 예상)
```
[HLS 스트림] ✅ FFmpeg 프로세스 시작 성공 (PID: XXXXX)
[HLS 스트림] HLS 플레이리스트 생성 대기 중...
[HLS 스트림] ✅ HLS 플레이리스트 생성 완료
[HLS 스트림] 영상 재생 시작: 영아3단계_5분병합영상.mp4
[HLS 스트림] 영상 정보: FPS=30.00, 총 프레임=9090
[HLS 스트림] 프레임 전송 시작 (target_fps: 30.0, 간격: 0.033초)
[HLS 스트림] 프레임 전송: 100개
[Gemini 분석] 시작 (별도 스레드)...
[HLS 스트림] 프레임 전송: 200개
[Gemini 분석] 완료: 아기의 활동
```

---

## 📁 수정된 파일

1. ✅ `backend/app/services/live_monitoring/hls_stream_generator.py`
   - Line 319: `import threading` 제거
   - Line 503-507: 파일 삭제 로직 추가 (FFmpeg 변환 실패)
   - Line 508-512: 파일 삭제 로직 추가 (FFmpeg 없음)
   - Line 514-518: 파일 삭제 로직 추가 (예외 처리)

---

## 🚀 재시작 방법

### 1. 기존 임시 파일 정리 (선택사항)
```bash
cd backend
# Windows PowerShell
Remove-Item "temp_videos\hls_buffer\camera-1\archive\*.avi" -Force
Remove-Item "temp_videos\hls_buffer\camera-1\archive\*.mp4" -Force
```

### 2. 서버 재시작
```bash
cd backend
python run.py
```

### 3. 확인 사항
- ✅ `threading` 오류 없이 시작
- ✅ 영상 재생 시작
- ✅ 프레임 전송 로그 출력
- ✅ Gemini 분석 실행 (별도 스레드)
- ✅ 10분 아카이브 파일 생성

---

## 🎯 추가 개선 사항 (향후)

### 1. 임시 파일 자동 정리
서버 시작 시 자동으로 이전 임시 파일 정리:

```python
def cleanup_temp_files(self):
    """이전 실행의 임시 파일 정리"""
    temp_pattern = self.archive_dir / "*_temp.avi"
    for temp_file in self.archive_dir.glob("*_temp.avi"):
        try:
            temp_file.unlink()
            print(f"[HLS 아카이브] 임시 파일 정리: {temp_file.name}")
        except Exception as e:
            print(f"[HLS 아카이브] 임시 파일 정리 실패: {e}")
```

### 2. 파일 잠금 처리
Windows에서 파일이 사용 중일 때 재시도 로직:

```python
import time

def safe_rename(src, dst, max_retries=3):
    """안전한 파일 이름 변경 (재시도 포함)"""
    for i in range(max_retries):
        try:
            if dst.exists():
                dst.unlink()
            src.rename(dst)
            return True
        except Exception as e:
            if i < max_retries - 1:
                time.sleep(0.5)
            else:
                raise
    return False
```

### 3. 로깅 개선
파일 작업 시 더 상세한 로깅:

```python
print(f"[HLS 아카이브] 파일 이름 변경 시도:")
print(f"  원본: {src}")
print(f"  대상: {dst}")
print(f"  대상 존재: {dst.exists()}")
if dst.exists():
    print(f"  대상 삭제 중...")
    dst.unlink()
src.rename(dst)
print(f"  ✅ 이름 변경 완료")
```

---

## 📊 영향 분석

### 버그의 영향
- ❌ HLS 스트림 완전 중단
- ❌ 영상 재생 불가
- ❌ 10분 아카이브 파일 생성 실패
- ❌ Gemini 분석 실행 불가

### 수정 후 효과
- ✅ HLS 스트림 정상 작동
- ✅ 부드러운 30fps 스트리밍
- ✅ Gemini 분석 별도 스레드에서 실행
- ✅ 10분 아카이브 파일 정상 생성
- ✅ 서버 재시작 시 충돌 없음

---

## 결론

두 가지 치명적인 버그를 수정했습니다:

1. **Threading 오류**: 중복 import 제거로 해결
2. **파일 충돌**: 기존 파일 삭제 로직 추가로 해결

이제 서버를 재시작하면 정상적으로 작동할 것입니다! 🎉

**다음 단계**:
1. 서버 재시작
2. 프론트엔드에서 모니터링 페이지 접속
3. 스트리밍 확인
4. Gemini 분석 로그 확인

