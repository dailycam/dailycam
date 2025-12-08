"""Gemini AI Content Curator"""

import os
import json
from typing import List, Dict, Any
import google.generativeai as genai

from app.services.gemini_tools import YouTubeSearchTool, WebSearchTool, extract_blog_thumbnail
from app.prompts.content_curation import (
    YOUTUBE_RECOMMENDATION_PROMPT,
    BLOG_RECOMMENDATION_PROMPT,
    TRENDING_CONTENT_PROMPT,
    get_development_stage
)


class GeminiContentCurator:
    """Gemini AI 기반 콘텐츠 큐레이터"""
    
    def __init__(self):
        """Initialize Gemini model and tools"""
        # GEMINI_API_KEY 사용
        api_key = os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            print("❌ [GeminiContentCurator] GEMINI_API_KEY가 설정되지 않았습니다! .env 파일을 확인해주세요.")
        else:
            print(f"✅ [GeminiContentCurator] GEMINI_API_KEY 로드됨 (길이: {len(api_key)})")

        # Google GenAI SDK 직접 사용
        genai.configure(api_key=api_key)
        
        # gemini-2.5-flash 사용 (최신, 빠름)
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')
        print(f"✅ [Gemini] 모델 초기화 완료")
        
        self.youtube_tool = YouTubeSearchTool()
        self.web_tool = WebSearchTool()
    
    async def get_recommended_videos(self, child_age_months: int) -> List[Dict[str, Any]]:
        """
        아이 개월 수에 맞는 YouTube 영상 추천
        
        Args:
            child_age_months: 아이 개월 수
            
        Returns:
            추천 영상 리스트
        """
        # 발달 단계 가져오기
        development_stage = get_development_stage(child_age_months)
        
        # 검색 쿼리 생성
        search_queries = self._generate_video_queries(child_age_months)
        
        # YouTube 검색
        all_videos = []
        for query in search_queries[:2]:  # 상위 2개 쿼리만 사용
            print(f"🔍 [YouTube] 검색 쿼리: {query}")
            videos = self.youtube_tool.search_videos(query, max_results=5)
            print(f"📹 [YouTube] 검색 결과: {len(videos)}개")
            all_videos.extend(videos)
        
        
        print(f"📊 [YouTube] 총 검색 결과: {len(all_videos)}개")
        
        if not all_videos:
            # YouTube API 키가 없거나 검색 실패 시 기본 콘텐츠 반환
            print("⚠️ [YouTube] 검색 결과 없음. Fallback 반환")
            return self._get_fallback_videos(child_age_months)
        
        # 검색 결과를 바로 반환 (Gemini 필터링 제거 - 속도 개선)
        print("✅ [YouTube] 검색 결과 그대로 반환 (빠른 응답)")
        return self._convert_search_to_recommendations(all_videos)
    
    async def get_recommended_blogs(self, child_age_months: int) -> List[Dict[str, Any]]:
        """
        아이 개월 수에 맞는 블로그 포스트 추천
        
        Args:
            child_age_months: 아이 개월 수
            
        Returns:
            추천 블로그 리스트
        """
        development_stage = get_development_stage(child_age_months)
        
        # 검색 쿼리 생성
        search_queries = self._generate_blog_queries(child_age_months)
        
        # 웹 검색
        all_blogs = []
        for query in search_queries[:2]:
            blogs = self.web_tool.search_blogs(query, max_results=5)
            all_blogs.extend(blogs)
        
        if not all_blogs:
            return self._get_fallback_blogs(child_age_months)
        
        # 검색 결과를 바로 반환 (Gemini 필터링 제거 - 속도 개선)
        print("✅ [Blog] 검색 결과 그대로 반환 (빠른 응답)")
        results = []
        for idx, blog in enumerate(all_blogs):
            results.append({
                'id': f"blog_{idx+1}",
                'type': 'blog',
                'title': blog.get('title', ''),
                'description': blog.get('description', '')[:200],
                'url': blog.get('url', ''),
                'thumbnail': None,
                'tags': [],
                'category': '육아'
            })
        return results if results else self._get_fallback_blogs(child_age_months)
    
    async def get_trending_content(self, child_age_months: int) -> List[Dict[str, Any]]:
        """
        트렌딩 콘텐츠 (유튜브 영상만 - "엄마들이 가장 많이 본")
        
        Args:
            child_age_months: 아이 개월 수
            
        Returns:
            트렌딩 유튜브 영상 리스트
        """
        development_stage = get_development_stage(child_age_months)
        
        # YouTube 검색만 수행
        trending_query = f'"{child_age_months}개월" 아기 육아 인기 한국'
        
        youtube_results = self.youtube_tool.search_videos(trending_query, max_results=10)
        
        if not youtube_results:
            print("⚠️ [Trending] YouTube 검색 결과 없음, Fallback 사용")
            return self._get_fallback_trending(child_age_months)
        
        # 검색 결과를 바로 반환 (Gemini 필터링 제거 - 속도 개선)
        print(f"✅ [Trending] YouTube 검색 결과: {len(youtube_results)}개")
        results = []
        
        # YouTube 결과만 추가
        for idx, video in enumerate(youtube_results):
            results.append({
                'id': f"trend_yt_{idx+1}",
                'type': 'youtube',
                'title': video.get('title', ''),
                'description': video.get('description', '')[:200],
                'url': video.get('url', ''),
                'thumbnail': video.get('thumbnail'),
                'channel': video.get('channel', ''),
                'views': self._format_views(video.get('view_count', 0)),
                'tags': [],
                'category': '트렌딩'
            })
        
        # 디버깅: 타입 확인
        print(f"🔍 [Trending] 반환할 결과 개수: {len(results)}")
        type_counts = {}
        for item in results:
            item_type = item.get('type', 'unknown')
            type_counts[item_type] = type_counts.get(item_type, 0) + 1
        print(f"🔍 [Trending] 타입별 개수: {type_counts}")
        
        return results if results else self._get_fallback_trending(child_age_months)
    
    async def get_recommended_news(self, child_age_months: int) -> List[Dict[str, Any]]:
        """
        아이 개월 수에 맞는 육아 뉴스 추천
        
        Args:
            child_age_months: 아이 개월 수
            
        Returns:
            추천 뉴스 리스트
        """
        development_stage = get_development_stage(child_age_months)
        
        # 뉴스 검색 쿼리 생성 (더 구체적으로)
        news_queries = [
            '육아 뉴스',
            '아기 건강 뉴스',
            '육아 정책'
        ]
        
        # 웹 검색으로 뉴스 찾기
        all_news = []
        for query in news_queries:  # 모든 쿼리 사용
            news = self.web_tool.search_news(query, max_results=5)
            all_news.extend(news)
        
        if not all_news:
            return self._get_fallback_news(child_age_months)
        
        # 검색 결과를 뉴스 형식으로 변환
        print("✅ [News] 검색 결과 그대로 반환 (빠른 응답)")
        results = []
        for idx, news in enumerate(all_news):
            results.append({
                'id': f"news_{idx+1}",
                'type': 'news',
                'title': news.get('title', ''),
                'description': news.get('description', '')[:200],
                'url': news.get('url', ''),
                'thumbnail': None,
                'tags': [],
                'category': '뉴스'
            })
        return results if results else self._get_fallback_news(child_age_months)
    
    def _generate_video_queries(self, age_months: int) -> List[str]:
        """영상 검색 쿼리 생성"""
        return [
            f'"{age_months}개월" 아기 발달 한국',
            f'"{age_months}개월" 육아 팁 한국',
            f'"{age_months}개월" 이유식 한국',
            f'"{age_months}개월" 놀이 한국'
        ]
    
    def _generate_blog_queries(self, age_months: int) -> List[str]:
        """블로그 검색 쿼리 생성"""
        return [
            f'"{age_months}개월" 아기 육아 한국',
            f'"{age_months}개월" 발달 체크 한국',
            f'"{age_months}개월" 수면 교육 한국'
        ]
    
    def _parse_json_response(self, response_text: str) -> List[Dict]:
        """Gemini 응답에서 JSON 파싱"""
        try:
            # JSON 코드 블록 제거
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            return json.loads(response_text.strip())
        except:
            return []
    
    def _format_views(self, view_count: int) -> str:
        """조회수 포맷팅"""
        if view_count >= 10000:
            return f"{view_count // 10000}만"
        elif view_count >= 1000:
            return f"{view_count // 1000}천"
        else:
            return str(view_count)
    
    def _get_category_from_tags(self, tags: List[str]) -> str:
        """태그에서 카테고리 추출"""
        category_keywords = {
            '발달': ['발달', '성장', '체크'],
            '영양': ['이유식', '수유', '영양', '먹기'],
            '수면': ['수면', '잠', '밤잠'],
            '안전': ['안전', '사고', '예방'],
            '놀이': ['놀이', '장난감', '활동']
        }
        
        for category, keywords in category_keywords.items():
            if any(keyword in tag for tag in tags for keyword in keywords):
                return category
        
        return '육아'
    
    def _get_fallback_videos(self, age_months: int) -> List[Dict[str, Any]]:
        """기본 영상 (API 실패 시)"""
        return [
            {
                'id': f'fallback_video_{age_months}',
                'type': 'youtube',
                'title': f'{age_months}개월 아기 발달 체크리스트',
                'description': '우리 아기가 정상적으로 발달하고 있는지 확인해보세요',
                'url': 'https://youtube.com',
                'tags': ['발달', f'{age_months}개월'],
                'category': '발달'
            }
        ]
    
    def _get_fallback_blogs(self, age_months: int) -> List[Dict[str, Any]]:
        """기본 블로그 (API 실패 시)"""
        return [
            {
                'id': f'fallback_blog_{age_months}',
                'type': 'blog',
                'title': f'{age_months}개월 육아 가이드',
                'description': '이 시기 아기 육아에 필요한 모든 정보',
                'url': 'https://blog.naver.com',
                'tags': ['육아', f'{age_months}개월'],
                'category': '육아'
            }
        ]
    
    def _get_fallback_trending(self, age_months: int) -> List[Dict[str, Any]]:
        """기본 트렌딩 (API 실패 시) - 유튜브만"""
        videos = self._get_fallback_videos(age_months)
        
        # ID 충돌 방지를 위해 prefix 추가
        for v in videos:
            v['id'] = f"trending_{v['id']}"
            
        return videos
    
    def _get_fallback_news(self, age_months: int) -> List[Dict[str, Any]]:
        """기본 뉴스 (API 실패 시)"""
        return [
            {
                'id': f'fallback_news_{age_months}',
                'type': 'news',
                'title': f'{age_months}개월 아기 육아 정보',
                'description': '최신 육아 뉴스와 정보를 확인하세요',
                'url': 'https://news.naver.com',
                'tags': ['뉴스', f'{age_months}개월'],
                'category': '뉴스'
            }
        ]
    
    def _convert_search_to_recommendations(self, search_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """검색 결과를 추천 형식으로 변환"""
        recommendations = []
        for idx, result in enumerate(search_results):
            recommendations.append({
                'id': f"search_{idx+1}",
                'type': 'youtube',
                'title': result.get('title', ''),
                'description': result.get('description', '')[:200],
                'url': result.get('url', ''),
                'thumbnail': result.get('thumbnail'),
                'channel': result.get('channel', ''),
                'views': self._format_views(result.get('view_count', 0)),
                'tags': [],
                'category': '육아'
            })
        return recommendations

