# DB 컬럼 추가 가이드

## 배경
일일 통계 집계 기능을 위해 `SafetyEvent`와 `DevelopmentEvent` 테이블에 `event_timestamp` 컬럼이 필요합니다.

## 방법 1: SQL 스크립트 실행 (기존 데이터 보존)

### Windows MySQL Command Line
```bash
mysql -u root -p dailycam < add_columns.sql
```

### MySQL Workbench
1. MySQL Workbench 열기
2. dailycam DB 선택
3. `add_columns.sql` 파일 열기
4. 실행 (Ctrl + Shift + Enter)

## 방법 2: DB 전체 재생성 (데이터 삭제됨)

```bash
cd backend
python -m app.database.init_db
```

⚠️ **주의**: 이 방법은 모든 데이터가 삭제됩니다!

## 완료 후
백엔드 서버를 재시작하세요.

## 확인
다음 명령어로 컬럼이 추가되었는지 확인:
```sql
DESCRIBE safety_event;
DESCRIBE development_event;
```

`event_timestamp` 컬럼이 보이면 성공!
