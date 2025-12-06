"""
발달 점수 디버깅 가이드
========================

## 문제 상황
- 안전 점수: 52점 (정상 표시)
- 발달 점수: 0점 (문제)

## 확인 단계

### 1. 브라우저에서 API 응답 확인
1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭 선택
3. 페이지 새로고침
4. `/api/dashboard/summary` 요청 찾기
5. Response 탭에서 `developmentScore` 값 확인

예상 응답:
```json
{
  "safetyScore": 52,
  "developmentScore": 0,  // 이 값이 0이면 백엔드 문제
  "incidentCount": 20,
  "monitoringHours": 0.4
}
```

### 2. 백엔드 로그 확인
```bash
# 도커 로그 확인
docker-compose logs -f fastapi

# 다음 로그를 찾으세요:
# [Dashboard] 발달 점수들: [...]
# [Dashboard] 평균 발달 점수: 0
```

### 3. 데이터베이스 확인
```bash
# 도커 MySQL 접속
docker-compose exec mysql mysql -u dailycam_user -p dailycam

# 비밀번호: dailycam_pass_2024

# SegmentAnalysis 테이블 확인
SELECT id, camera_id, segment_start, development_score, safety_score, status 
FROM segment_analyses 
WHERE DATE(segment_start) = CURDATE() 
ORDER BY segment_start DESC 
LIMIT 10;

# development_score 컬럼이 있는지 확인
DESCRIBE segment_analyses;
```

## 해결 방법

### A. development_score 컬럼이 없는 경우
```bash
# 마이그레이션 실행
docker-compose exec fastapi python migrate_segment_analysis.py
```

### B. development_score가 NULL인 경우
- 새로운 분석이 아직 실행되지 않음
- 10분 단위 분석이 완료될 때까지 대기
- 또는 수동으로 분석 트리거:
```bash
# 분석 워커 로그 확인
docker-compose logs -f vlm-worker-1
```

### C. 백엔드 코드가 반영되지 않은 경우
```bash
# 도커 재빌드
docker-compose down
docker-compose up -d --build
```

## 예상 원인

1. **마이그레이션 미실행**: development_score 컬럼이 DB에 없음
2. **코드 미반영**: 도커 컨테이너가 재시작되지 않음
3. **분석 미완료**: 새로운 10분 분석이 아직 실행되지 않음

## 빠른 해결 순서

```bash
# 1. 마이그레이션 실행
docker-compose exec fastapi python migrate_segment_analysis.py

# 2. FastAPI 재시작
docker-compose restart fastapi

# 3. 로그 확인
docker-compose logs -f fastapi

# 4. 10분 대기 후 페이지 새로고침
```
"""
