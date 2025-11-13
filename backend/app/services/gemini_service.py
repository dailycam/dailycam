"""Gemini AI 비디오 분석 서비스"""

import base64
import json
import os
from pathlib import Path
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import UploadFile

# .env 파일 로드
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)


class GeminiService:
    """Gemini 2.5 Flash를 사용한 비디오 분석 서비스"""

    def __init__(self):
        """Gemini API 클라이언트 초기화"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.\n"
                f"backend/.env 파일에 GEMINI_API_KEY를 설정해주세요.\n"
                f".env 파일 경로: {env_path}"
            )
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    async def analyze_video(
        self, 
        video_file: Optional[UploadFile] = None,
        video_bytes: Optional[bytes] = None,
        content_type: Optional[str] = None,
    ) -> dict:
        """
        비디오 파일을 분석하여 안전 정보를 반환합니다.
        
        Args:
            video_file: 업로드된 비디오 파일 (선택)
            video_bytes: 비디오 바이트 데이터 (선택, video_file이 없을 때 사용)
            content_type: 비디오 MIME 타입 (video_bytes 사용 시 필수)
            
        Returns:
            분석 결과 딕셔너리
        """
        try:
            # 비디오 파일 읽기
            if video_file:
                video_bytes = await video_file.read()
                mime_type = video_file.content_type or "video/mp4"
            elif video_bytes:
                mime_type = content_type or "video/mp4"
            else:
                raise ValueError("video_file 또는 video_bytes 중 하나는 필수입니다.")
            
            # Base64 인코딩
            video_base64 = base64.b64encode(video_bytes).decode('utf-8')
            
            # 프롬프트 생성
            prompt = self._create_analysis_prompt()
            
            # Gemini API 호출
            response = self.model.generate_content([
                {
                    'mime_type': mime_type,
                    'data': video_base64
                },
                prompt
            ])
            
            # 응답 파싱
            if not response or not hasattr(response, 'text'):
                raise ValueError("Gemini API 응답이 올바르지 않습니다.")
            
            result_text = response.text.strip()
            
            # JSON 추출 (마크다운 코드 블록 제거)
            if result_text.startswith('```json'):
                result_text = result_text.replace('```json\n', '').replace('```', '')
            elif result_text.startswith('```'):
                result_text = result_text.replace('```\n', '').replace('```', '')
            
            # JSON 파싱
            try:
                analysis_data = json.loads(result_text)
            except json.JSONDecodeError as json_err:
                print(f"⚠️ JSON 파싱 실패. 원본 응답:\n{result_text[:500]}")
                raise ValueError(f"AI 응답을 파싱할 수 없습니다: {str(json_err)}")
            
            # 응답 데이터 정규화
            return {
                'total_incidents': analysis_data.get('total_incidents', 0),
                'falls': analysis_data.get('falls', 0),
                'dangerous_actions': analysis_data.get('dangerous_actions', 0),
                'safety_score': analysis_data.get('safety_score', 0),
                'timeline_events': analysis_data.get('timeline_events', []),
                'summary': analysis_data.get('summary', '분석 완료'),
                'recommendations': analysis_data.get('recommendations', [])
            }
            
        except json.JSONDecodeError as e:
            import traceback
            print(f"❌ JSON 파싱 오류: {str(e)}")
            print(f"상세:\n{traceback.format_exc()}")
            raise ValueError(f"AI 응답을 파싱할 수 없습니다: {str(e)}")
        except ValueError as e:
            # ValueError는 그대로 전달
            raise
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            error_msg = str(e)
            print(f"❌ Gemini 비디오 분석 오류: {error_msg}")
            print(f"상세 에러:\n{error_trace}")
            raise Exception(f"비디오 분석 중 오류 발생: {error_msg}")

    def _create_analysis_prompt(self) -> str:
        """비디오 분석을 위한 프롬프트 생성"""
        return """
당신은 영유아 안전 모니터링 전문가입니다. 이 비디오를 분석하여 다음 사항들을 감지하고 JSON 형식으로 응답해주세요.

**중요: 모든 응답은 반드시 한글로만 작성해주세요. 영어를 절대 사용하지 마세요.**

분석할 항목:
1. 넘어짐 (fall) - 아이가 넘어지거나 균형을 잃는 순간
2. 위험한 행동 (danger) - 위험한 물건을 만지거나 위험한 장소에 접근
3. 경고 상황 (warning) - 잠재적으로 위험할 수 있는 상황
4. 안전한 활동 (safe) - 정상적이고 안전한 활동

각 이벤트에 대해 타임스탬프와 한글로 구체적인 설명을 제공해주세요.

**중요: type 필드는 반드시 "fall", "danger", "warning", "safe" 중 하나만 사용하세요. "dangerous_action"이 아닌 "danger"를 사용하세요.**

응답 형식 (모든 설명은 한글로):
{
  "total_incidents": 전체 사건 수(숫자),
  "falls": 넘어짐 횟수(숫자),
  "dangerous_actions": 위험한 행동 횟수(숫자),
  "safety_score": 0부터 100 사이의 안전도 점수(숫자),
  "timeline_events": [
    {
      "timestamp": "00:00:05",
      "type": "fall",
      "description": "한글로 작성된 구체적인 설명",
      "severity": "high"
    }
  ],
  "summary": "한글로 작성된 전체 비디오 요약 (한 줄)",
  "recommendations": ["한글로 작성된 안전 개선 추천 사항들"]
}

**다시 강조: timeline_events의 type은 반드시 "fall", "danger", "warning", "safe" 중 하나여야 합니다.**

예시:
{
  "total_incidents": 3,
  "falls": 1,
  "dangerous_actions": 1,
  "safety_score": 75,
  "timeline_events": [
    {
      "timestamp": "00:00:15",
      "type": "fall",
      "description": "아이가 소파에서 내려오다가 균형을 잃고 넘어졌습니다",
      "severity": "high"
    },
    {
      "timestamp": "00:01:30",
      "type": "danger",
      "description": "아이가 콘센트 근처에 접근했습니다",
      "severity": "high"
    },
    {
      "timestamp": "00:02:10",
      "type": "warning",
      "description": "아이가 계단 근처에서 놀고 있습니다",
      "severity": "medium"
    }
  ],
  "summary": "대체로 안전하나 1회 넘어짐이 감지되었습니다",
  "recommendations": ["소파 주변에 안전 매트를 설치하세요", "아이가 높은 곳에서 내려올 때 보호자가 지켜봐 주세요"]
}
"""


# 싱글톤 인스턴스
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Gemini 서비스 인스턴스를 반환합니다."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service

