# 🎥 LiveStream 기능 통합 계획

## 📋 개요
`test/livestream` 브랜치의 HLS 스트리밍 및 실시간 모니터링 기능을 현재 main 브랜치에 통합

## 전략
- ✅ **현재 코드 기반 유지** (최신 버전)
- ✅ **test/livestream의 개선사항만 선택적 통합**
- ✅ **AppHome.tsx, Dashboard.tsx 유지**

## 🔍 통합할 주요 기능

### 백엔드
1. **새로운 데이터베이스 모델**
   - RealtimeEvent (실시간 이벤트)
   - SegmentAnalysis (5분 단위 분석)
   - HourlyAnalysis (1시간 단위 분석)
   - DailyReport (일일 리포트)

2. **HLS 스트리밍 서비스**
   - HLS 스트림 생성기
   - 실시간 감지기
   - 세그먼트 분석기

3. **API 엔드포인트 추가**
   - HLS 스트림 제공
   - 실시간 이벤트 조회
   - 통계 API
   - 일일 리포트 API

### 프론트엔드
1. **HLS.js 통합**
   - 현재 이미지 스트림 → HLS 비디오 스트림
   
2. **실시간 데이터 연동**
   - 목업 데이터 → 실제 API 데이터

## 📝 작업 순서

### Step 1: 백엔드 모델 추가
- [ ] live_monitoring 모델 생성
- [ ] 데이터베이스 테이블 생성

### Step 2: 백엔드 서비스 추가
- [ ] HLS 스트림 생성기
- [ ] 실시간 감지 서비스

### Step 3: 백엔드 API 업데이트
- [ ] router.py 업그레이드
- [ ] 새로운 엔드포인트 추가

### Step 4: 프론트엔드 업데이트
- [ ] HLS.js 설치
- [ ] Monitoring.tsx HLS 지원 추가
- [ ] API 클라이언트 업데이트

### Step 5: 테스트
- [ ] 백엔드 API 테스트
- [ ] 프론트엔드 스트리밍 테스트
