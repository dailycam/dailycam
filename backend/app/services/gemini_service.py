"""Gemini AI 비디오 분석 서비스"""

import base64
import json
import os
from pathlib import Path
from typing import Optional, Tuple

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
            result = {
                'total_incidents': analysis_data.get('total_incidents', 0),
                'falls': analysis_data.get('falls', 0),
                'dangerous_actions': analysis_data.get('dangerous_actions', 0),
                'safety_score': analysis_data.get('safety_score', 0),
                'timeline_events': analysis_data.get('timeline_events', []),
                'summary': analysis_data.get('summary', '분석 완료'),
                'recommendations': analysis_data.get('recommendations', [])
            }
            
            return result
            
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

    def _load_prompt(self, filename: str) -> str:
        """프롬프트 파일을 로드합니다."""
        prompts_dir = Path(__file__).parent.parent / 'prompts'
        prompt_path = prompts_dir / filename
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            raise FileNotFoundError(f"프롬프트 파일을 찾을 수 없습니다: {prompt_path}")

    def _create_analysis_prompt(self) -> str:
        """비디오 분석을 위한 프롬프트 생성"""
        return self._load_prompt('video_analysis_prompt.txt')


# 싱글톤 인스턴스
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Gemini 서비스 인스턴스를 반환합니다."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service

