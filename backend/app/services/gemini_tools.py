"""Gemini AI Tools for content curation"""

import os
import requests
from typing import List, Dict, Any, Optional
from googleapiclient.discovery import build
from tavily import TavilyClient
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup


class YouTubeSearchTool:
    """YouTube 영상 검색 도구"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("YOUTUBE_API_KEY")
        if self.api_key:
            self.youtube = build('youtube', 'v3', developerKey=self.api_key)
        else:
            self.youtube = None
            print("⚠️ [YouTubeSearchTool] YOUTUBE_API_KEY가 없습니다. DuckDuckGo 검색을 사용합니다.")
    
    def search_videos(
        self, 
        query: str, 
        max_results: int = 10,
        min_views: int = 10000
    ) -> List[Dict[str, Any]]:
        """
        YouTube 영상 검색
        """
        if self.youtube:
            return self._search_with_api(query, max_results, min_views)
        else:
            return self._search_with_ddg(query, max_results)
            
    def _search_with_api(self, query: str, max_results: int, min_views: int) -> List[Dict[str, Any]]:
        try:
            # 영상 검색
            search_response = self.youtube.search().list(
                part="snippet",
                q=query,
                type="video",
                maxResults=max_results,  # 2배수 제거하여 Quota 절약
                relevanceLanguage="ko",
                order="relevance",
                regionCode="KR"
            ).execute()
            
            videos = []
            for item in search_response.get('items', []):
                video_id = item['id']['videoId']
                snippet = item['snippet']
                
                # 영상 상세 정보 가져오기 (조회수 확인)
                # Quota 절약을 위해 상세 정보 조회는 최소화하거나 생략 고려 가능
                # 여기서는 유지하되 예외 처리 강화
                try:
                    video_response = self.youtube.videos().list(
                        part="statistics,contentDetails",
                        id=video_id
                    ).execute()
                    
                    if video_response['items']:
                        stats = video_response['items'][0]['statistics']
                        view_count = int(stats.get('viewCount', 0))
                        
                        if view_count >= min_views:
                            videos.append({
                                'video_id': video_id,
                                'title': snippet['title'],
                                'description': snippet['description'],
                                'channel': snippet['channelTitle'],
                                'thumbnail': snippet['thumbnails']['high']['url'],
                                'published_at': snippet['publishedAt'],
                                'view_count': view_count,
                                'url': f"https://www.youtube.com/watch?v={video_id}"
                            })
                except Exception:
                    # 상세 정보 조회 실패 시 기본 정보만으로 추가 (Quota 절약)
                    videos.append({
                        'video_id': video_id,
                        'title': snippet['title'],
                        'description': snippet['description'],
                        'channel': snippet['channelTitle'],
                        'thumbnail': snippet['thumbnails']['high']['url'],
                        'published_at': snippet['publishedAt'],
                        'view_count': 0,
                        'url': f"https://www.youtube.com/watch?v={video_id}"
                    })
                
                if len(videos) >= max_results:
                    break
            
            return videos[:max_results]
            
        except Exception as e:
            print(f"YouTube API 검색 오류: {e}")
            # API 오류 시 DuckDuckGo로 Fallback
            print("⚠️ [YouTube] API 오류 발생. DuckDuckGo 검색으로 전환합니다.")
            return self._search_with_ddg(query, max_results)

    def _search_with_ddg(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """DuckDuckGo를 사용한 YouTube 검색 (API 키 없을 때)"""
        try:
            with DDGS() as ddgs:
                results = ddgs.videos(
                    keywords=f"{query} site:youtube.com",
                    region="kr-kr",
                    safesearch="moderate",
                    max_results=max_results * 2
                )
                
                videos = []
                for r in results:
                    # DDG 결과 매핑
                    # r = {'content': '...', 'description': '...', 'duration': '...', 'embed_html': '...', 'embed_url': '...', 'images': {...}, 'provider': 'YouTube', 'published': '...', 'publisher': '...', 'statistics': {'viewCount': ...}, 'title': '...', 'uploader': '...', 'url': '...'}
                    
                    # 조회수 확인 (DDG 결과에 statistics가 있는 경우)
                    view_count = 0
                    if 'statistics' in r and 'viewCount' in r['statistics']:
                        view_count = r['statistics']['viewCount']
                    elif 'views' in r: # 일부 버전에서는 views로 옴
                        view_count = r['views']
                        
                    videos.append({
                        'video_id': r.get('id', ''), # DDG는 ID를 직접 주지 않을 수 있음
                        'title': r.get('title', ''),
                        'description': r.get('description', ''),
                        'channel': r.get('uploader', ''),
                        'thumbnail': r.get('images', {}).get('large', '') or r.get('image', ''),
                        'published_at': r.get('published', ''),
                        'view_count': view_count,
                        'url': r.get('content', '') or r.get('url', '')
                    })
                    
                    if len(videos) >= max_results:
                        break
                        
                return videos
        except Exception as e:
            print(f"DuckDuckGo 영상 검색 오류: {e}")
            return []


class WebSearchTool:
    """웹 검색 도구 (Tavily or DuckDuckGo)"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        if self.api_key:
            self.client = TavilyClient(api_key=self.api_key)
        else:
            self.client = None
            print("⚠️ [WebSearchTool] TAVILY_API_KEY가 없습니다. DuckDuckGo 검색을 사용합니다.")
    
    def search_blogs(
        self, 
        query: str, 
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        육아 블로그 검색
        """
        if self.client:
            return self._search_with_tavily(query, max_results)
        else:
            return self._search_with_ddg(query, max_results)

    def _search_with_tavily(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        try:
            response = self.client.search(
                query=query + " 육아 블로그",
                search_depth="advanced",
                max_results=max_results,
                include_domains=[
                    "blog.naver.com",
                    "brunch.co.kr",
                    "tistory.com",
                    "velog.io"
                ]
            )
            
            blogs = []
            for result in response.get('results', []):
                blogs.append({
                    'title': result.get('title', ''),
                    'description': result.get('content', '')[:200],
                    'url': result.get('url', ''),
                    'score': result.get('score', 0.0)
                })
            
            return blogs
            
        except Exception as e:
            print(f"Tavily 웹 검색 오류: {e}")
            return []

    def _search_with_ddg(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """DuckDuckGo를 사용한 블로그 검색 (API 키 없을 때)"""
        try:
            with DDGS() as ddgs:
                # 한국 블로그 위주로 검색
                search_query = f"{query} (site:blog.naver.com OR site:brunch.co.kr OR site:tistory.com)"
                results = ddgs.text(
                    keywords=search_query,
                    region="kr-kr",
                    safesearch="moderate",
                    max_results=max_results
                )
                
                blogs = []
                import json
                import re
                
                for r in results:
                    # description 안전하게 처리
                    desc = r.get('body', '')
                    if not isinstance(desc, str):
                        desc = str(desc) if desc else ''
                    
                    # DuckDuckGo JSON 아티팩트 처리
                    if desc.strip().startswith('{"title":'):
                        # 1. JSON 파싱 시도
                        try:
                            parsed = json.loads(desc)
                            desc = parsed.get('snippet', parsed.get('body', ''))
                        except:
                            # 2. 파싱 실패 시 정규식으로 snippet 추출 시도
                            match = re.search(r'"snippet":"(.*?)(?:"[,}]|$)', desc)
                            if match:
                                desc = match.group(1).replace('\\"', '"').replace('\\n', ' ')
                            else:
                                # 3. 추출 실패 시 JSON 덩어리를 보여주느니 차라리 빈칸으로 처리
                                desc = ''
                    
                    # HTML 태그 및 남은 특수문자 제거
                    desc = re.sub(r'<[^>]+>', '', desc)
                    desc = desc.replace('{"title":', '').replace('"source":', '')
                    
                    blogs.append({
                        'title': r.get('title', ''),
                        'description': desc.strip()[:200],
                        'url': r.get('href', ''),
                        'score': 0.0
                    })
                    
                return blogs
        except Exception as e:
            print(f"DuckDuckGo 웹 검색 오류: {e}")
            return []


def extract_blog_thumbnail(url: str) -> Optional[str]:
    """블로그 URL에서 Open Graph 썸네일 추출"""
    try:
        print(f"🖼️ [Thumbnail] 추출 시도: {url}")
        
        # User-Agent 설정 (네이버 블로그 접근 시 필요)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Open Graph 이미지 찾기
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            thumbnail_url = og_image['content']
            print(f"✅ [Thumbnail] OG 이미지 발견: {thumbnail_url[:80]}...")
            return thumbnail_url
        
        # Twitter 카드 이미지 찾기 (대체)
        twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
        if twitter_image and twitter_image.get('content'):
            thumbnail_url = twitter_image['content']
            print(f"✅ [Thumbnail] Twitter 이미지 발견: {thumbnail_url[:80]}...")
            return thumbnail_url
        
        # 첫 번째 이미지 찾기 (최후의 수단)
        first_img = soup.find('img')
        if first_img and first_img.get('src'):
            img_src = first_img['src']
            # 상대 경로를 절대 경로로 변환
            if img_src.startswith('//'):
                thumbnail_url = 'https:' + img_src
                print(f"✅ [Thumbnail] 첫 이미지 발견 (//): {thumbnail_url[:80]}...")
                return thumbnail_url
            elif img_src.startswith('/'):
                from urllib.parse import urlparse
                parsed = urlparse(url)
                thumbnail_url = f"{parsed.scheme}://{parsed.netloc}{img_src}"
                print(f"✅ [Thumbnail] 첫 이미지 발견 (/): {thumbnail_url[:80]}...")
                return thumbnail_url
            print(f"✅ [Thumbnail] 첫 이미지 발견: {img_src[:80]}...")
            return img_src
        
        print(f"⚠️ [Thumbnail] 이미지 없음: {url}")
        return None
    except Exception as e:
        print(f"❌ [Thumbnail] 추출 오류 ({url}): {e}")
        return None

