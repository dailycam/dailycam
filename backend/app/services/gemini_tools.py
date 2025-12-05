"""Gemini AI Tools for content curation"""

import os
import requests
from typing import List, Dict, Any, Optional
from googleapiclient.discovery import build
from tavily import TavilyClient
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup


import re

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
                        view_count = r['statistics']['viewCount'] or 0
                    elif 'views' in r: # 일부 버전에서는 views로 옴
                        view_count = r['views'] or 0
                        
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

    def _is_safe_content(self, title: str, description: str) -> bool:
        """콘텐츠 안전성 및 관련성 검사"""
        # 금지어 목록 (스팸, 도박, 성인, 과도한 광고)
        blacklist = [
            '도박', '카지노', '바카라', '토토', '성인', '19금', '야동',
            '대출', '금리', '수익', '투자', '주식', '코인', '분양', '매매',
            '가입코드', '추천인', '이벤트', '당첨', '무료', '쿠폰'
        ]
        
        text = (title + " " + description).lower()
        
        # 0. 한국어 포함 여부 확인 (중국어/영어 스팸 필터링)
        # 한글이 하나도 없으면 외국 사이트(중국어 등)로 간주하고 필터링
        if not re.search('[가-힣]', text):
            # print(f"🚫 [Filter] 한글 없음: {title[:30]}...")
            return False
        
        # 1. 금지어 포함 여부 확인
        for word in blacklist:
            if word in text:
                return False
                
        # 2. 육아 관련성 확인 (선택적 - 너무 엄격하면 결과가 없을 수 있음)
        # keywords = ['육아', '아기', '아이', '베이비', '맘', '부모', '교육', '발달', '놀이']
        # if not any(k in text for k in keywords):
        #     return False
            
        return True

    def _search_with_tavily(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        try:
            # 검색어에 광고 제외 키워드 추가
            safe_query = f"{query} 육아 팁 -광고 -협찬 -판매"
            
            response = self.client.search(
                query=safe_query,
                search_depth="advanced",
                max_results=max_results * 4  # 필터링을 고려해 더 많이 요청 (4배수)
            )
            
            blogs = []
            for result in response.get('results', []):
                title = result.get('title', '')
                description = result.get('content', '')[:200]
                url = result.get('url', '')
                
                # 안전성 검사
                if not self._is_safe_content(title, description):
                    continue
                    
                blogs.append({
                    'title': title,
                    'description': description,
                    'url': url,
                    'score': result.get('score', 0.0)
                })
                
                if len(blogs) >= max_results:
                    break
            
            return blogs
            
        except Exception as e:
            print(f"Tavily 웹 검색 오류: {e}")
            return []

    def _search_with_ddg(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """DuckDuckGo를 사용한 블로그 검색 (API 키 없을 때)"""
        try:
            with DDGS() as ddgs:
                # 블로그 키워드 추가 및 광고 제외 (중국 사이트 제외 추가)
                search_query = f"{query} 육아 블로그 -광고 -협찬 -쿠팡파트너스 -site:.cn -중국"
                
                results = ddgs.text(
                    keywords=search_query,
                    region="kr-kr",
                    safesearch="moderate",
                    max_results=max_results * 5  # 필터링 고려하여 5배수 요청
                )
                
                blogs = []
                import json
                
                for r in results:
                    # description 안전하게 처리
                    desc = r.get('body', '')
                    if not isinstance(desc, str):
                        desc = str(desc) if desc else ''
                    
                    # DuckDuckGo JSON 아티팩트 처리 (기존 로직 유지)
                    if desc.strip().startswith('{"title":'):
                        try:
                            parsed = json.loads(desc)
                            desc = parsed.get('snippet', parsed.get('body', ''))
                        except:
                            match = re.search(r'"snippet":"(.*?)(?:"[,}]|$)', desc)
                            if match:
                                desc = match.group(1).replace('\\"', '"').replace('\\n', ' ')
                            else:
                                desc = ''
                    
                    # HTML 태그 및 남은 특수문자 제거
                    desc = re.sub(r'<[^>]+>', '', desc)
                    desc = desc.replace('{"title":', '').replace('"source":', '')
                    
                    title = r.get('title', '')
                    
                    # URL 추출 (여러 키 시도)
                    url = r.get('href') or r.get('link') or r.get('url', '')
                    
                    # 0. 도메인 필터링 (중국 사이트 강력 차단)
                    if any(domain in url for domain in ['.cn', 'zhihu.com', 'baidu.com', '163.com', 'qq.com', 'bilibili.com']):
                        print(f"🚫 [Filter] 중국 도메인 차단: {url}")
                        continue

                    # 안전성 검사 (한글 포함 여부 등)
                    if not self._is_safe_content(title, desc):
                        continue
                    
                    # 디버그 로깅
                    print(f"📝 [Blog] 제목: {title[:50]}")
                    print(f"🔗 [Blog] URL: {url}")
                    
                    blogs.append({
                        'title': title,
                        'description': desc.strip()[:200],
                        'url': url,
                        'score': 0.0
                    })
                    
                    if len(blogs) >= max_results:
                        break
                    
                return blogs
        except Exception as e:
            print(f"DuckDuckGo 웹 검색 오류: {e}")
            return []
    
    def search_news(
        self, 
        query: str, 
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        뉴스 검색 (DuckDuckGo news 메서드 사용)
        """
        try:
            print(f"🔍 [News] 검색 쿼리: {query}")
            with DDGS() as ddgs:
                # DuckDuckGo의 news() 메서드 사용
                results = ddgs.news(
                    keywords=query,
                    region="kr-kr",
                    safesearch="moderate",
                    max_results=max_results
                )
                
                news = []
                result_count = 0
                
                for r in results:
                    result_count += 1
                    print(f"📰 [News] 결과 {result_count}: {r.get('title', 'No title')[:50]}")
                    
                    # 이미지 URL 추출 시도
                    thumbnail = r.get('image', None)
                    
                    # DuckDuckGo에서 이미지를 제공하지 않으면 URL에서 추출 시도
                    if not thumbnail:
                        url = r.get('url', '')
                        if url:
                            print(f"🔍 [News] URL에서 썸네일 추출 시도: {url[:50]}...")
                            thumbnail = extract_blog_thumbnail(url)
                    
                    if thumbnail:
                        print(f"✅ [News] 썸네일: {thumbnail[:80]}...")
                    else:
                        print(f"⚠️ [News] 썸네일 없음")
                    
                    news.append({
                        'title': r.get('title', ''),
                        'description': r.get('body', '')[:200],
                        'url': r.get('url', ''),
                        'thumbnail': thumbnail,
                        'score': 0.0
                    })
                
                print(f"✅ [News] 총 {len(news)}개 결과 반환")
                return news
        except Exception as e:
            print(f"❌ [News] DuckDuckGo 뉴스 검색 오류: {e}")
            import traceback
            traceback.print_exc()
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

