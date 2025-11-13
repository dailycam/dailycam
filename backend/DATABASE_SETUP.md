# 데이터베이스 설정 가이드

## 1. 데이터베이스 생성

MariaDB/MySQL에서 데이터베이스를 생성합니다:

```sql
CREATE DATABASE dailycam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. 환경 변수 설정

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

## 3. 테이블 생성

### 방법 1: SQL 스크립트 실행 (권장)

```bash
mysql -u root -p dailycam < backend/database/schema.sql
```

### 방법 2: 자동 생성

FastAPI 애플리케이션을 실행하면 자동으로 테이블이 생성됩니다:

```bash
cd backend
python run.py
```

## 4. 테이블 구조

다음 테이블들이 생성됩니다:

- `videos` - 비디오 파일 정보
- `video_analyses` - 비디오 분석 결과
- `timeline_events` - 타임라인 이벤트
- `analysis_recommendations` - 분석 추천 사항
- `daily_reports` - 일일 리포트
- `report_time_slots` - 리포트 시간대별 활동
- `report_risk_priorities` - 리포트 위험도 우선순위
- `report_action_recommendations` - 리포트 실행 리스트
- `highlights` - 하이라이트 영상

## 5. 확인

데이터베이스 연결을 확인하려면:

```bash
cd backend
python -c "from app.database import engine; print('연결 성공!' if engine else '연결 실패!')"
```

