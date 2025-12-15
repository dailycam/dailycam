# 데이터베이스 아키텍처 설계: 스트리밍 서버 분리

## 📋 현재 구조 vs 제안된 구조

### 현재 구조 (DB 직접 사용)

```
[업로드]
사용자 → FastAPI → S3 업로드 → DB에 file_path 저장
                              ↓
[스트리밍]
HLS Generator → DB 조회 (CameraVideo) → file_path 사용
              → 로컬 파일 없으면 S3 다운로드
              → FFmpeg로 HLS 생성
```

**특징:**
- 스트리밍 서버가 DB를 직접 조회
- VideoQueue가 DB에서 CameraVideo 조회
- 로컬 파일이 없으면 S3에서 다운로드

**문제점:**
- 스트리밍 서버가 MySQL에 직접 연결 필요
- 서버 분리 시 MySQL 외부 접근 필요
- 보안 위험 (MySQL 포트 노출)

---

### 제안된 구조 (API 기반)

```
[업로드]
사용자 → FastAPI → S3 업로드 → DB에 메타데이터만 저장
                              (s3_key, status, hls_url 등)
                              ↓
[스트리밍]
HLS Generator → API 호출로 영상 목록 조회
              → S3에서 직접 다운로드 (또는 캐시)
              → FFmpeg로 HLS 생성
              → 완료 후 API로 hls_url 업데이트
```

**특징:**
- 스트리밍 서버는 DB를 직접 사용하지 않음
- API를 통해서만 상태 조회/업데이트
- S3를 단일 소스로 사용

**장점:**
- 보안 강화 (MySQL 포트 노출 불필요)
- 서버 분리 용이
- 확장성 향상

---

## 🎯 추천: 하이브리드 방식

### 최적 구조

```
[업로드]
사용자 → FastAPI (스트리밍 서버) → S3 업로드
                                → DB에 메타데이터 저장
                                → status = 'UPLOADED'

[트랜스코딩]
FastAPI → FFmpeg로 HLS 생성
        → S3에 HLS 파일 업로드
        → DB 업데이트: hls_url, status = 'READY'

[스트리밍]
HLS Generator → DB 조회 (로컬 캐시 우선)
              → 로컬에 없으면 S3에서 다운로드
              → FFmpeg로 스트리밍
```

### 핵심 변경사항

#### 1. CameraVideo 모델 확장

```python
class CameraVideo(Base):
    # 기존 필드
    filename = Column(String(500))
    file_path = Column(String(1000))  # 로컬 경로 (캐시)
    
    # 추가 필드
    s3_key = Column(String(1000))  # S3 키 (원본)
    s3_hls_key = Column(String(1000))  # S3 HLS 경로 (선택)
    hls_url = Column(String(1000))  # HLS 스트림 URL
    status = Column(Enum('UPLOADED', 'PROCESSING', 'READY', 'ERROR'))
    file_size = Column(Integer)
    duration = Column(Integer)
```

#### 2. 스트리밍 서버는 DB 직접 사용 유지

**이유:**
- 현재 코드 구조와 호환성 유지
- VideoQueue가 이미 DB 기반으로 구현됨
- 로컬 캐시를 사용하므로 S3 다운로드는 최소화

**보안:**
- MySQL 방화벽으로 워커 서버 IP만 허용
- 스트리밍 서버는 로컬 MySQL 사용 (127.0.0.1)

#### 3. 워커 서버는 원격 MySQL 접근

**이유:**
- VLM 분석 Job 조회 필요
- 분석 결과 저장 필요

**보안:**
- 방화벽으로 워커 서버 IP만 허용
- MySQL 사용자 권한 제한

---

## 🔐 보안 설정

### 스트리밍 서버 MySQL 설정

**옵션 1: 로컬만 허용 (권장)**
```yaml
# docker-compose.streaming.yml
mysql:
  ports:
    - "127.0.0.1:3306:3306"  # 로컬만 허용
```

**옵션 2: 워커 서버만 허용**
```yaml
# docker-compose.streaming.yml
mysql:
  ports:
    - "0.0.0.0:3306:3306"  # 외부 접근 허용
```

**Lightsail 방화벽:**
- MySQL (3306): 워커 서버 Static IP만 허용

**MySQL 사용자 권한:**
```sql
-- 워커 서버 IP만 허용
CREATE USER 'dailycam_user'@'워커서버IP' IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE ON dailycam.analysis_jobs TO 'dailycam_user'@'워커서버IP';
GRANT SELECT ON dailycam.camera_videos TO 'dailycam_user'@'워커서버IP';
FLUSH PRIVILEGES;
```

---

## 📊 데이터 흐름

### 1. 영상 업로드

```
사용자 업로드
  ↓
FastAPI (스트리밍 서버)
  ↓
S3 업로드 (원본 영상)
  ↓
DB 저장:
  - s3_key: "videos/{camera_id}/{filename}.mp4"
  - status: "UPLOADED"
  - file_path: "/app/videos/{camera_id}/{filename}.mp4" (로컬 캐시)
```

### 2. HLS 스트리밍 시작

```
HLS Generator 시작
  ↓
DB 조회 (CameraVideo where is_active=True)
  ↓
로컬 파일 확인
  ├─ 있음 → 바로 사용
  └─ 없음 → S3 다운로드 → 로컬 캐시
  ↓
FFmpeg로 HLS 생성
  ↓
스트리밍 시작
```

### 3. VLM 분석

```
10분마다 아카이브 생성
  ↓
S3 업로드
  ↓
DB에 AnalysisJob 등록
  ↓
워커 서버가 Job 조회 (원격 MySQL)
  ↓
S3에서 다운로드
  ↓
VLM 분석
  ↓
결과 저장 (원격 MySQL)
```

---

## ✅ 최종 권장사항

### 현재 구조 유지 + 보안 강화

**이유:**
1. **코드 변경 최소화**: VideoQueue가 이미 DB 기반
2. **성능**: 로컬 캐시 사용으로 S3 다운로드 최소화
3. **호환성**: 기존 코드와 완벽 호환

**보안 강화:**
1. MySQL 방화벽 설정 (워커 서버 IP만 허용)
2. MySQL 사용자 권한 제한
3. 스트리밍 서버는 로컬 MySQL 사용 (127.0.0.1)

**추가 개선 (선택):**
1. CameraVideo 모델에 `s3_key`, `status` 필드 추가
2. S3를 단일 소스로 사용하도록 점진적 전환
3. 로컬 캐시는 성능 최적화용으로만 사용

---

## 🔄 마이그레이션 계획

### Phase 1: 현재 구조 유지 (즉시)
- 스트리밍 서버: 로컬 MySQL 사용
- 워커 서버: 원격 MySQL 접근
- 방화벽 설정으로 보안 강화

### Phase 2: 모델 확장 (선택)
- CameraVideo에 `s3_key`, `status` 필드 추가
- S3를 단일 소스로 사용하도록 점진적 전환

### Phase 3: API 기반 전환 (장기)
- 스트리밍 서버가 DB 직접 사용하지 않도록 API 전환
- 완전한 서버 분리

---

**작성일**: 2025-12-12  
**버전**: 1.0

