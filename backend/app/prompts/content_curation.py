"""Content curation prompts for Gemini AI"""

# 개월 수별 발달 단계 매핑
DEVELOPMENT_STAGES = {
    (0, 3): "신생아기 (0-3개월): 목 가누기, 시각/청각 발달, 미소 짓기",
    (4, 6): "영아기 초기 (4-6개월): 뒤집기, 옹알이, 손으로 물건 잡기, 이유식 시작",
    (7, 9): "영아기 중기 (7-9개월): 앉기, 배밀이, 낯가림, 손가락으로 집기",
    (10, 12): "영아기 후기 (10-12개월): 잡고 서기, 첫 걸음마, 간단한 단어",
    (13, 18): "걸음마기 초기 (13-18개월): 혼자 걷기, 단어 조합, 호기심 증가",
    (19, 24): "걸음마기 중기 (19-24개월): 뛰기, 2-3단어 문장, 자아 발달",
    (25, 36): "걸음마기 후기 (25-36개월): 복잡한 문장, 또래 놀이, 배변 훈련"
}


def get_development_stage(age_months: int) -> str:
    """개월 수에 맞는 발달 단계 반환"""
    for (min_age, max_age), stage in DEVELOPMENT_STAGES.items():
        if min_age <= age_months <= max_age:
            return stage
    return "유아기 (36개월 이상)"


YOUTUBE_RECOMMENDATION_PROMPT = """당신은 육아 전문가이자 콘텐츠 큐레이터입니다.

현재 상황:
- 아이 개월 수: {age_months}개월
- 발달 단계: {development_stage}

임무:
1. {age_months}개월 아기를 키우는 부모에게 가장 유용한 YouTube 영상을 추천하세요.
2. 다음 기준으로 영상을 평가하고 필터링하세요:
   - 발달 단계에 적합한 내용
   - 신뢰할 수 있는 채널 (소아과 의사, 육아 전문가, 검증된 육아 채널 등)
   - 실용적이고 도움이 되는 정보
   - 한국어 콘텐츠

3. 각 영상에 대해 다음 정보를 JSON 배열 형식으로 제공하세요:
[
  {{
    "id": "yt1",
    "title": "영상 제목",
    "description": "부모에게 도움이 되는 핵심 내용 요약 (50자 이내)",
    "tags": ["태그1", "태그2", "태그3"],
    "relevance_score": 0.95,
    "reason": "이 영상을 추천하는 이유 (간단히)"
  }}
]

검색 결과:
{search_results}

위 검색 결과 중에서 가장 유용한 상위 5개 영상을 JSON 배열로 추천해주세요.
반드시 유효한 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요.
"""


BLOG_RECOMMENDATION_PROMPT = """당신은 육아 전문가이자 콘텐츠 큐레이터입니다.

현재 상황:
- 아이 개월 수: {age_months}개월
- 발달 단계: {development_stage}

임무:
1. {age_months}개월 아기를 키우는 부모에게 유용한 블로그 포스트를 추천하세요.
2. 다음 기준으로 평가하세요:
   - 발달 단계에 맞는 실용적인 정보
   - 검증된 정보 (의학적 근거, 전문가 의견 등)
   - 구체적인 팁과 노하우

3. 각 블로그에 대해 JSON 배열 형식으로 제공:
[
  {{
    "id": "blog1",
    "title": "글 제목",
    "description": "핵심 내용 요약 (100자 이내)",
    "tags": ["태그1", "태그2"],
    "relevance_score": 0.90
  }}
]

검색 결과:
{search_results}

위 검색 결과 중에서 가장 유용한 상위 5개 블로그를 JSON 배열로 추천해주세요.
반드시 유효한 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요.
"""


TRENDING_CONTENT_PROMPT = """당신은 육아 전문가이자 콘텐츠 큐레이터입니다.

현재 상황:
- 아이 개월 수: {age_months}개월
- 발달 단계: {development_stage}

임무:
1. {age_months}개월 아기를 키우는 부모들이 가장 많이 찾는 트렌딩 콘텐츠를 추천하세요.
2. YouTube 영상과 블로그 포스트를 혼합하여 추천하세요.
3. 다음 주제를 우선적으로 고려하세요:
   - 발달 체크리스트
   - 이유식/수유
   - 수면 교육
   - 안전사고 예방
   - 놀이 방법

4. JSON 배열 형식으로 제공:
[
  {{
    "id": "trend1",
    "type": "youtube" 또는 "blog",
    "title": "제목",
    "description": "요약 (50자 이내)",
    "tags": ["태그1", "태그2"],
    "views": "조회수 (있는 경우)",
    "relevance_score": 0.95
  }}
]

YouTube 검색 결과:
{youtube_results}

블로그 검색 결과:
{blog_results}

위 검색 결과를 종합하여 가장 인기 있고 유용한 상위 8개 콘텐츠를 JSON 배열로 추천해주세요.
YouTube와 블로그를 적절히 섞어서 추천하세요.
반드시 유효한 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요.
"""
