#!/bin/bash

# ============================================
# DailyCam AWS Lightsail 배포 스크립트
# ============================================

set -e  # 에러 발생 시 스크립트 중단

echo "=========================================="
echo "🚀 DailyCam 배포 시작"
echo "=========================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 환경 변수 파일 확인
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production 파일이 없습니다!${NC}"
    echo "   .env.production.example을 복사하여 .env.production을 생성하세요."
    exit 1
fi

# 프론트엔드 빌드
echo -e "${YELLOW}📦 프론트엔드 빌드 중...${NC}"
cd frontend

# API Base URL 확인
if [ -z "$VITE_API_BASE_URL" ]; then
    echo -e "${YELLOW}⚠️  VITE_API_BASE_URL이 설정되지 않았습니다.${NC}"
    echo "   .env.production에서 VITE_API_BASE_URL을 확인하세요."
    read -p "계속 진행하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 환경 변수 로드
source ../.env.production
export VITE_API_BASE_URL

npm ci
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ 프론트엔드 빌드 실패!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 프론트엔드 빌드 완료${NC}"
cd ..

# Docker 이미지 빌드
echo -e "${YELLOW}🐳 Docker 이미지 빌드 중...${NC}"
docker-compose -f docker-compose.production.yml build

# 기존 컨테이너 중지 및 제거
echo -e "${YELLOW}🛑 기존 컨테이너 중지 중...${NC}"
docker-compose -f docker-compose.production.yml down

# 새 컨테이너 시작
echo -e "${YELLOW}🚀 새 컨테이너 시작 중...${NC}"
docker-compose -f docker-compose.production.yml up -d

# 컨테이너 상태 확인
echo -e "${YELLOW}📊 컨테이너 상태 확인 중...${NC}"
sleep 5
docker-compose -f docker-compose.production.yml ps

# 헬스 체크
echo -e "${YELLOW}🏥 헬스 체크 중...${NC}"
sleep 10

# FastAPI 헬스 체크
if curl -f http://localhost:8000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ FastAPI 서버 정상 작동${NC}"
else
    echo -e "${RED}❌ FastAPI 서버 응답 없음${NC}"
    echo "   로그 확인: docker-compose -f docker-compose.production.yml logs fastapi"
fi

# Nginx 헬스 체크
if curl -f http://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx 서버 정상 작동${NC}"
else
    echo -e "${RED}❌ Nginx 서버 응답 없음${NC}"
    echo "   로그 확인: docker-compose -f docker-compose.production.yml logs nginx"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✨ 배포 완료!${NC}"
echo "=========================================="
echo ""
echo "📝 다음 명령어로 로그를 확인하세요:"
echo "   docker-compose -f docker-compose.production.yml logs -f"
echo ""
echo "📝 컨테이너 상태 확인:"
echo "   docker-compose -f docker-compose.production.yml ps"
echo ""
echo "📝 특정 서비스 로그 확인:"
echo "   docker-compose -f docker-compose.production.yml logs -f [service_name]"
echo ""

