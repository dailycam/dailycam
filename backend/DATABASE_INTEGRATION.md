# 데이터베이스 연동 가이드

## 📋 목차

1. [개요](#개요)
2. [데이터베이스 설정](#데이터베이스-설정)
3. [환경 변수 설정](#환경-변수-설정)
4. [테이블 생성](#테이블-생성)
5. [SQLAlchemy ORM 구조](#sqlalchemy-orm-구조)
6. [데이터베이스 모델](#데이터베이스-모델)
7. [Repository 패턴](#repository-패턴)
8. [API 연동](#api-연동)
9. [트러블슈팅](#트러블슈팅)

---

## 개요

DailyCam 백엔드는 **MariaDB 10.11 / MySQL 8.0**을 사용하며, **SQLAlchemy ORM**을 통해 데이터베이스와 연동합니다.

### 기술 스택
- **데이터베이스**: MariaDB 10.11 / MySQL 8.0
- **ORM**: SQLAlchemy 2.0+
- **드라이버**: PyMySQL
- **마이그레이션**: Alembic (선택사항)

---

## 데이터베이스 설정

### 1. 데이터베이스 생성

MariaDB/MySQL에서 데이터베이스를 생성합니다:

```sql
CREATE DATABASE dailycam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 사용자 권한 설정 (선택사항)

```sql
CREATE USER 'dailycam_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON dailycam.* TO 'dailycam_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 환경 변수 설정

### `.env` 파일 생성

`backend/.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=dailycam

# Gemini API 키
GEMINI_API_KEY=your_gemini_api_key_here
```

### 중요: `.env` 파일 로드

`backend/app/database/session.py` 파일에서 `.env` 파일을 자동으로 로드합니다:

```python
# .env 파일을 먼저 로드 (다른 import 전에)
from dotenv import load_dotenv
load_dotenv()
```

**주의**: `load_dotenv()`는 파일 맨 위에서 호출해야 환경 변수가 제대로 로드됩니다.

---

## 테이블 생성

### 방법 1: SQL 스크립트 실행 (권장)

```bash
mysql -u root -p dailycam < backend/database/schema.sql
```

또는 MySQL 클라이언트에서:

```sql
USE dailycam;
SOURCE backend/database/schema.sql;
```

### 방법 2: 자동 생성 (SQLAlchemy)

백엔드 서버를 실행하면 자동으로 테이블이 생성됩니다:

```bash
cd backend
python run.py
```

`backend/app/main.py`에서 다음 코드가 테이블을 자동 생성합니다:

```python
from app.database import Base, engine
from app.models.daily_report.models import (
    Video, VideoAnalysis, TimelineEvent, AnalysisRecommendation,
    DailyReport, ReportTimeSlot, ReportRiskPriority,
    ReportActionRecommendation, Highlight,
)

# 데이터베이스 테이블 자동 생성
Base.metadata.create_all(bind=engine)
```

---

## SQLAlchemy ORM 구조

### 디렉토리 구조

```
backend/app/
├── database/
│   ├── __init__.py      # Base, engine, SessionLocal, get_db export
│   ├── base.py          # Base 클래스 (declarative_base)
│   └── session.py       # 엔진, 세션, 연결 설정
├── models/
│   └── daily_report/
│       ├── __init__.py
│       └── models.py    # ORM 모델 정의
└── services/
    └── daily_report/
        └── repository.py # 데이터베이스 작업 처리
```

### 데이터베이스 연결

`backend/app/database/session.py`:

```python
from dotenv import load_dotenv
load_dotenv()

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 환경 변수에서 데이터베이스 정보 읽기
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "dailycam")

# 데이터베이스 URL 생성
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

# SQLAlchemy 엔진 생성
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # 연결 상태 확인
    pool_recycle=3600,       # 1시간마다 연결 재사용
    echo=False               # SQL 쿼리 로깅 (개발 시 True)
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FastAPI 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 데이터베이스 모델

### 주요 테이블 구조

#### 1. `videos` - 비디오 파일 정보
```python
class Video(Base):
    id: int (PK)
    filename: str
    file_path: str
    file_size: int
    duration: float
    mime_type: str
    created_at: datetime
```

#### 2. `video_analyses` - 비디오 분석 결과
```python
class VideoAnalysis(Base):
    id: int (PK)
    video_id: int (FK -> videos.id)
    total_incidents: int
    falls: int
    dangerous_actions: int
    safety_score: int
    summary: str
    created_at: datetime
```

#### 3. `timeline_events` - 타임라인 이벤트
```python
class TimelineEvent(Base):
    id: int (PK)
    analysis_id: int (FK -> video_analyses.id)
    timestamp: str (예: "00:00:05")
    type: Enum (fall, danger, warning, safe)
    description: str
    severity: Enum (high, medium, low)
```

#### 4. `daily_reports` - 일일 리포트
```python
class DailyReport(Base):
    id: int (PK)
    analysis_id: int (FK -> video_analyses.id)
    report_date: datetime
    overall_summary: str
    total_monitoring_time: str
    safe_zone_percentage: int
    activity_level: str
    created_at: datetime
    
    # 관계 (Relationships)
    time_slots: List[ReportTimeSlot]
    risk_priorities: List[ReportRiskPriority]
    action_recommendations: List[ReportActionRecommendation]
    highlights: List[Highlight]
```

#### 5. `report_time_slots` - 리포트 시간대별 활동
```python
class ReportTimeSlot(Base):
    id: int (PK)
    report_id: int (FK -> daily_reports.id)
    time_range: str (예: "09:00 - 12:00")
    activity: str
    safety_score: int
    incidents: int
    summary: str
```

#### 6. `report_risk_priorities` - 리포트 위험도 우선순위
```python
class ReportRiskPriority(Base):
    id: int (PK)
    report_id: int (FK -> daily_reports.id)
    level: Enum (high, medium, low)
    title: str
    description: str
    location: str
    time_range: str
    count: int
```

#### 7. `report_action_recommendations` - 리포트 실행 리스트
```python
class ReportActionRecommendation(Base):
    id: int (PK)
    report_id: int (FK -> daily_reports.id)
    priority: Enum (high, medium, low)
    title: str
    description: str
    estimated_cost: str
    difficulty: str
```

#### 8. `highlights` - 하이라이트 영상
```python
class Highlight(Base):
    id: int (PK)
    report_id: int (FK -> daily_reports.id)
    event_id: int (FK -> timeline_events.id, nullable)
    title: str
    timestamp: str
    duration: str
    location: str
    severity: Enum (high, medium, low)
    description: str
    video_url: str
    thumbnail_url: str (nullable)
```

---

## Repository 패턴

### Eager Loading (관계 데이터 자동 로드)

리포트 조회 시 모든 관계 데이터를 함께 가져오기 위해 `selectinload`를 사용합니다:

```python
from sqlalchemy.orm import selectinload

def get_latest_daily_report(self) -> Optional[DailyReport]:
    """가장 최근 리포트 조회 (모든 관계 데이터 포함)"""
    return (
        self.db.query(DailyReport)
        .options(
            selectinload(DailyReport.time_slots),
            selectinload(DailyReport.risk_priorities),
            selectinload(DailyReport.action_recommendations),
            selectinload(DailyReport.highlights)
        )
        .order_by(DailyReport.created_at.desc())
        .first()
    )
```

### 데이터 저장 예시

```python
from app.services.daily_report.repository import DailyReportRepository

repository = DailyReportRepository(db)

# 리포트 저장
saved_report = repository.save_daily_report(
    analysis_id=analysis_id,
    report_data=report_data,
    video_path=video_path
)
```

---

## API 연동

### FastAPI 의존성 주입

```python
from app.database import get_db
from app.services.daily_report import DailyReportService, get_daily_report_service

@router.get("/latest")
async def get_latest_daily_report(
    service: DailyReportService = Depends(get_daily_report_service),
    db: Session = Depends(get_db),
):
    report = service.get_latest_report(db)
    if not report:
        raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
    return report
```

### 데이터 흐름

```
1. 비디오 업로드
   → VideoStorage.save_video()
   → DB: videos 테이블 저장

2. Gemini 분석
   → analyze_video()
   → DB: video_analyses, timeline_events, analysis_recommendations 저장

3. 리포트 생성
   → generate_from_analysis()
   → MoviePy 하이라이트 생성
   → DB: daily_reports, report_time_slots, report_risk_priorities,
         report_action_recommendations, highlights 저장

4. 리포트 조회
   → get_latest_report()
   → Eager Loading으로 모든 관계 데이터 로드
   → JSON 응답 반환
```

---

## 트러블슈팅

### 1. 연결 오류: `Access denied`

**원인**: 데이터베이스 사용자 권한 문제

**해결**:
```sql
GRANT ALL PRIVILEGES ON dailycam.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. 환경 변수가 로드되지 않음

**원인**: `load_dotenv()` 호출 순서 문제

**해결**: `backend/app/database/session.py` 파일 맨 위에서 `load_dotenv()` 호출 확인

### 3. 관계 데이터가 비어있음

**원인**: Lazy Loading으로 인한 데이터 누락

**해결**: Repository에서 `selectinload` 사용 확인

```python
.options(
    selectinload(DailyReport.time_slots),
    selectinload(DailyReport.risk_priorities),
    # ...
)
```

### 4. 422 Unprocessable Entity 오류

**원인**: Response model과 반환 데이터 불일치

**해결**: Response model 제거 또는 데이터 구조 확인

### 5. 테이블이 생성되지 않음

**원인**: 모델 import 누락

**해결**: `backend/app/main.py`에서 모든 모델 import 확인

```python
from app.models.daily_report.models import (
    Video, VideoAnalysis, TimelineEvent, AnalysisRecommendation,
    DailyReport, ReportTimeSlot, ReportRiskPriority,
    ReportActionRecommendation, Highlight,
)
```

### 6. 한글 인코딩 문제

**원인**: 데이터베이스 charset 설정 문제

**해결**: 
- 데이터베이스 생성 시 `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` 사용
- 연결 URL에 `charset=utf8mb4` 포함 확인

---

## 확인 방법

### 1. 데이터베이스 연결 확인

```bash
cd backend
python -c "from app.database import engine; print('연결 성공!' if engine else '연결 실패!')"
```

### 2. 테이블 목록 확인

```sql
USE dailycam;
SHOW TABLES;
```

### 3. 데이터 확인

```sql
SELECT * FROM daily_reports ORDER BY created_at DESC LIMIT 1;
SELECT * FROM report_time_slots WHERE report_id = 1;
SELECT * FROM highlights WHERE report_id = 1;
```

### 4. API 테스트

```bash
# 최신 리포트 조회
curl http://localhost:8000/api/daily-report/latest

# 특정 리포트 조회
curl http://localhost:8000/api/daily-report/1
```

---

## 추가 리소스

- [SQLAlchemy 공식 문서](https://docs.sqlalchemy.org/)
- [FastAPI 데이터베이스 가이드](https://fastapi.tiangolo.com/tutorial/sql-databases/)
- [MariaDB 공식 문서](https://mariadb.com/kb/en/documentation/)

---

## 요약

1. ✅ MariaDB/MySQL 데이터베이스 생성
2. ✅ `.env` 파일에 연결 정보 설정
3. ✅ SQLAlchemy ORM으로 모델 정의
4. ✅ Repository 패턴으로 데이터 접근
5. ✅ Eager Loading으로 관계 데이터 로드
6. ✅ FastAPI 의존성 주입으로 세션 관리

데이터베이스 연동이 완료되면 비디오 분석 결과와 리포트가 자동으로 저장되고 조회됩니다! 🎉

