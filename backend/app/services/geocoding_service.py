"""Geocoding service for converting coordinates to location names"""

import requests
from typing import Optional


def get_location_from_coords(latitude: float, longitude: float) -> Optional[str]:
    """
    좌표를 한국 지역명(시/도)으로 변환
    
    Args:
        latitude: 위도
        longitude: 경도
        
    Returns:
        지역명 (예: "서울특별시", "부산광역시") 또는 None
    """
    try:
        # BigDataCloud의 무료 Reverse Geocoding API 사용 (API 키 불필요)
        url = "https://api.bigdatacloud.net/data/reverse-geocode-client"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "localityLanguage": "ko"  # 한국어로 결과 받기
        }
        
        print(f"🌍 [Geocoding] 좌표 → 지역명 변환 시도: ({latitude}, {longitude})")
        
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        # 시/도 정보 추출
        # principalSubdivision: "Seoul" 형태로 반환됨
        # locality: 도시명
        # city: 도시명
        
        # 한국 지역명 매핑
        location_map = {
            "Seoul": "서울",
            "Busan": "부산",
            "Daegu": "대구",
            "Incheon": "인천",
            "Gwangju": "광주",
            "Daejeon": "대전",
            "Ulsan": "울산",
            "Sejong": "세종",
            "Gyeonggi-do": "경기",
            "Gangwon-do": "강원",
            "North Chungcheong": "충북",
            "South Chungcheong": "충남",
            "North Jeolla": "전북",
            "South Jeolla": "전남",
            "North Gyeongsang": "경북",
            "South Gyeongsang": "경남",
            "Jeju-do": "제주"
        }
        
        # principalSubdivision 우선 사용
        subdivision = data.get("principalSubdivision", "")
        if subdivision in location_map:
            location = location_map[subdivision]
            print(f"✅ [Geocoding] 지역명: {location}")
            return location
        
        # locality 사용
        locality = data.get("locality", "")
        if locality:
            # locality가 한글이면 그대로 사용
            if any('\uac00' <= c <= '\ud7a3' for c in locality):
                print(f"✅ [Geocoding] 지역명: {locality}")
                return locality
            # 영어면 매핑 시도
            elif locality in location_map:
                location = location_map[locality]
                print(f"✅ [Geocoding] 지역명: {location}")
                return location
        
        # city 사용
        city = data.get("city", "")
        if city:
            if any('\uac00' <= c <= '\ud7a3' for c in city):
                print(f"✅ [Geocoding] 지역명: {city}")
                return city
            elif city in location_map:
                location = location_map[city]
                print(f"✅ [Geocoding] 지역명: {location}")
                return location
        
        print(f"⚠️ [Geocoding] 지역명을 찾을 수 없음. 응답: {data}")
        return None
        
    except requests.exceptions.Timeout:
        print(f"⚠️ [Geocoding] 타임아웃 (5초 초과)")
        return None
    except requests.exceptions.RequestException as e:
        print(f"❌ [Geocoding] API 요청 실패: {e}")
        return None
    except Exception as e:
        print(f"❌ [Geocoding] 예상치 못한 오류: {e}")
        return None
