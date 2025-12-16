"""Content recommendation API router"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date

from app.database import get_db
from app.models.user import User
from app.utils.auth_utils import get_current_user_id
from app.services.gemini_content_curator import GeminiContentCurator
from app.services.content_cache import get_from_cache, save_to_cache
from app.services.geocoding_service import get_location_from_coords
from app.models.analysis import AnalysisLog
from app.models.live_monitoring.models import SegmentAnalysis
from pydantic import BaseModel
from typing import Optional


router = APIRouter(prefix="/api/content", tags=["content"])

# Gemini Content Curator 싱글톤 인스턴스
_curator_instance = None

def get_curator() -> GeminiContentCurator:
    """GeminiContentCurator 싱글톤 인스턴스 반환"""
    global _curator_instance
    if _curator_instance is None:
        _curator_instance = GeminiContentCurator()
    return _curator_instance



def calculate_age_months(birthdate: date) -> int:
    """생년월일로부터 개월 수 계산"""
    if not birthdate:
        return 6  # 기본값
    
    today = datetime.now().date()
    year_diff = today.year - birthdate.year
    month_diff = today.month - birthdate.month
    day_diff = today.day - birthdate.day
    
    total_months = year_diff * 12 + month_diff
    
    if day_diff < 0:
        total_months -= 1
    
    return max(0, total_months)


@router.get("/recommended-videos")
async def get_recommended_videos(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    AI 추천 YouTube 영상
    
    사용자의 아이 개월 수에 맞는 YouTube 영상을 Gemini AI가 추천합니다.
    """
    # 사용자 정보 가져오기
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    # 개월 수 계산
    age_months = calculate_age_months(user.child_birthdate) if user.child_birthdate else 6
    
    # 캐시 확인
    cache_key = f"videos:{age_months}"
    cached = get_from_cache(cache_key)
    if cached:
        return {
            "videos": cached,
            "age_months": age_months,
            "cached": True,
            "cached_at": datetime.utcnow().isoformat()
        }
    
    # Gemini AI Agent 호출
    try:
        curator = get_curator()
        videos = await curator.get_recommended_videos(age_months)
        
        # 캐시 저장 (24시간)
        save_to_cache(cache_key, videos, ttl=86400)
        
        return {
            "videos": videos,
            "age_months": age_months,
            "cached": False,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"영상 추천 오류: {e}")
        raise HTTPException(status_code=500, detail="영상 추천 중 오류가 발생했습니다")


@router.get("/recommended-blogs")
async def get_recommended_blogs(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    AI 추천 블로그 포스트
    
    사용자의 아이 개월 수에 맞는 블로그 포스트를 Gemini AI가 추천합니다.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    age_months = calculate_age_months(user.child_birthdate) if user.child_birthdate else 6
    
    # 캐시 확인
    cache_key = f"blogs:{age_months}"
    cached = get_from_cache(cache_key)
    if cached:
        return {
            "blogs": cached,
            "age_months": age_months,
            "cached": True,
            "cached_at": datetime.utcnow().isoformat()
        }
    
    # Gemini AI Agent 호출
    try:
        curator = get_curator()
        blogs = await curator.get_recommended_blogs(age_months)
        
        # 캐시 저장 (24시간)
        save_to_cache(cache_key, blogs, ttl=86400)
        
        return {
            "blogs": blogs,
            "age_months": age_months,
            "cached": False,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"블로그 추천 오류: {e}")
        raise HTTPException(status_code=500, detail="블로그 추천 중 오류가 발생했습니다")


class LocationRequest(BaseModel):
    """위치 정보 요청 모델"""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.post("/recommended-news")
async def get_recommended_news(
    location_data: LocationRequest = None,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    AI 추천 뉴스
    
    사용자의 아이 개월 수에 맞는 육아 뉴스를 Gemini AI가 추천합니다.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    age_months = calculate_age_months(user.child_birthdate) if user.child_birthdate else 6
    
    # 위치 정보 처리
    location = None
    if location_data and location_data.latitude and location_data.longitude:
        print(f"📍 [News API] 위치 정보 수신: ({location_data.latitude}, {location_data.longitude})")
        location = get_location_from_coords(location_data.latitude, location_data.longitude)
        if location:
            print(f"✅ [News API] 지역명 변환 성공: {location}")
        else:
            print(f"⚠️ [News API] 지역명 변환 실패, 전국 뉴스로 fallback")
    
    # 캐시 확인 (위치 정보 포함)
    cache_key = f"news:{age_months}:{location}" if location else f"news:{age_months}"
    cached = get_from_cache(cache_key)
    if cached:
        return {
            "news": cached,
            "age_months": age_months,
            "location": location,
            "cached": True,
            "cached_at": datetime.utcnow().isoformat()
        }
    
    # Gemini AI Agent 호출
    try:
        curator = get_curator()
        news = await curator.get_recommended_news(age_months, location=location)
        
        # 캐시 저장 (24시간)
        save_to_cache(cache_key, news, ttl=86400)
        
        return {
            "news": news,
            "age_months": age_months,
            "location": location,
            "cached": False,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"뉴스 추천 오류: {e}")
        raise HTTPException(status_code=500, detail="뉴스 추천 중 오류가 발생했습니다")


@router.get("/trending")
async def get_trending_content(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    트렌딩 콘텐츠 (영상+블로그 혼합)
    
    사용자의 아이 개월 수에 맞는 인기 콘텐츠를 Gemini AI가 추천합니다.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    age_months = calculate_age_months(user.child_birthdate) if user.child_birthdate else 6
    
    # 캐시 확인
    cache_key = f"trending:{age_months}"
    cached = get_from_cache(cache_key)
    if cached:
        return {
            "content": cached,
            "age_months": age_months,
            "cached": True,
            "cached_at": datetime.utcnow().isoformat()
        }
    
    # Gemini AI Agent 호출
    try:
        curator = get_curator()
        content = await curator.get_trending_content(age_months)
        
        # 캐시 저장 (24시간)
        save_to_cache(cache_key, content, ttl=86400)
        
        return {
            "content": content,
            "age_months": age_months,
            "cached": False,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"트렌딩 콘텐츠 추천 오류: {e}")
        raise HTTPException(status_code=500, detail="트렌딩 콘텐츠 추천 중 오류가 발생했습니다")


@router.get("/search")
async def search_content(
    query: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    콘텐츠 검색
    
    사용자가 입력한 키워드로 YouTube 영상과 블로그를 검색합니다.
    """
    if not query or len(query.strip()) < 2:
        raise HTTPException(status_code=400, detail="검색어는 최소 2자 이상이어야 합니다")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    age_months = calculate_age_months(user.child_birthdate) if user.child_birthdate else 6
    
    # 캐시 확인
    cache_key = f"search:{query.strip()}:{age_months}"
    cached = get_from_cache(cache_key)
    if cached:
        return {
            "results": cached,
            "query": query,
            "age_months": age_months,
            "cached": True
        }
    
    # 검색 수행
    try:
        curator = get_curator()
        
        # 1. AI 분석된 발달 단계 조회
        detected_stage = None
        
        # 최근 7일 내 로그 조회 (최신 데이터 우선)
        today = datetime.now()
        week_before = today - timedelta(days=7)
        
        latest_log = db.query(AnalysisLog).filter(
            AnalysisLog.user_id == user_id,
            AnalysisLog.created_at >= week_before
        ).order_by(AnalysisLog.created_at.desc()).first()
        
        if latest_log and latest_log.assumed_stage:
            detected_stage = latest_log.assumed_stage
            
        if not detected_stage:
            # SegmentAnalysis 조회
            latest_segment = db.query(SegmentAnalysis).filter(
                SegmentAnalysis.camera_id == "camera-1", # TODO: 사용자별 카메라 매핑
                SegmentAnalysis.created_at >= week_before,
                SegmentAnalysis.status == 'completed'
            ).order_by(SegmentAnalysis.created_at.desc()).first()
            
            if latest_segment and latest_segment.analysis_result:
                if isinstance(latest_segment.analysis_result, dict):
                    meta = latest_segment.analysis_result.get('meta', {})
                    if meta and meta.get('assumed_stage'):
                        detected_stage = meta.get('assumed_stage')

        # 2. 검색 컨텍스트 설정 (분석된 단계 우선, 없으면 생일 기반 월령)
        search_context = f'"{age_months}개월"'
        
        STAGE_AGE_MAP = {
            "1": "0~2개월", "2": "3~5개월", "3": "6~8개월", "4": "9~11개월",
            "5": "12~17개월", "6": "18~23개월", "7": "24~29개월", "8": "30~35개월",
            "9": "36~47개월", "10": "48~59개월", "11": "60~71개월"
        }

        if detected_stage:
            import re
            match = re.search(r'\d+', str(detected_stage))
            if match:
                stage_num = match.group()
                if stage_num in STAGE_AGE_MAP:
                    # 분석된 단계가 있으면 해당 월령 범위를 검색어로 사용
                    # 예: 5단계 -> "12~17개월"
                    search_context = f'"{STAGE_AGE_MAP[stage_num]}"'
                    print(f"[Search] 🤖 AI 분석 발달 단계 적용: {detected_stage} -> {search_context}")
        
        # YouTube, 블로그, 뉴스 검색 (개별 예외 처리로 전체 실패 방지)
        search_query = f'{query} {search_context}'
        print(f"[Search] 최종 검색 쿼리: {search_query}")
        
        videos = []
        try:
            videos = curator.youtube_tool.search_videos(search_query, max_results=10)
        except Exception as e:
            print(f"⚠️ [Search] YouTube 검색 실패: {e}")

        blogs = []
        try:
            blogs = curator.web_tool.search_blogs(search_query, max_results=10)
        except Exception as e:
            print(f"⚠️ [Search] 블로그 검색 실패: {e}")

        news = []
        try:
            news = curator.web_tool.search_news(search_query, max_results=10)
        except Exception as e:
            print(f"⚠️ [Search] 뉴스 검색 실패: {e}")
        
        # 결과 변환
        results = []
        
        # YouTube 결과 추가
        for idx, video in enumerate(videos):
            results.append({
                'id': f"search_yt_{idx}",
                'type': 'youtube',
                'title': video.get('title', ''),
                'description': video.get('description', '')[:200],
                'url': video.get('url', ''),
                'thumbnail': video.get('thumbnail'),
                'channel': video.get('channel', ''),
                'views': curator._format_views(video.get('view_count') or 0),
                'tags': [],
                'category': '검색'
            })
        
        # 블로그 결과 추가
        for idx, blog in enumerate(blogs):
            results.append({
                'id': f"search_blog_{idx}",
                'type': 'blog',
                'title': blog.get('title', ''),
                'description': blog.get('description', '')[:200],
                'url': blog.get('url', ''),
                'thumbnail': None,
                'tags': [],
                'category': '검색'
            })
        
        # 뉴스 결과 추가
        for idx, news_item in enumerate(news):
            results.append({
                'id': f"search_news_{idx}",
                'type': 'news',
                'title': news_item.get('title', ''),
                'description': news_item.get('description', '')[:200],
                'url': news_item.get('url', ''),
                'thumbnail': None,
                'tags': [],
                'category': news_item.get('source', '뉴스')
            })
        
        # 캐시 저장 (1시간)
        save_to_cache(cache_key, results, ttl=3600)
        
        return {
            "results": results,
            "query": query,
            "age_months": age_months,
            "cached": False
        }
    except Exception as e:
        print(f"검색 오류: {e}")
        raise HTTPException(status_code=500, detail="검색 중 오류가 발생했습니다")


@router.post("/clear-cache")
async def clear_content_cache(
    user_id: int = Depends(get_current_user_id)
):
    """
    콘텐츠 캐시 삭제
    
    개발/테스트 목적으로 캐시를 수동으로 삭제합니다.
    """
    from app.services.content_cache import clear_cache, get_cache_stats
    
    # 캐시 삭제 전 통계
    before_stats = get_cache_stats()
    
    # 캐시 삭제
    clear_cache()
    
    return {
        "message": "캐시가 삭제되었습니다",
        "before": before_stats,
        "after": get_cache_stats()
    }

