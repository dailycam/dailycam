"""Content recommendation API router"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date

from app.database import get_db
from app.models.user import User
from app.utils.auth_utils import get_current_user_id
from app.services.gemini_content_curator import GeminiContentCurator
from app.services.content_cache import get_from_cache, save_to_cache


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
        
        # YouTube와 블로그 검색
        search_query = f'{query} "{age_months}개월"'
        videos = curator.youtube_tool.search_videos(search_query, max_results=10)
        blogs = curator.web_tool.search_blogs(search_query, max_results=10)
        
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
                'views': curator._format_views(video.get('view_count', 0)),
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

