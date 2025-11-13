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

    async def analyze_video(self, video_file: UploadFile, save_video: bool = False) -> Tuple[dict, Optional[str]]:
        """
        비디오 파일을 분석하여 안전 정보를 반환합니다.
        
        Args:
            video_file: 업로드된 비디오 파일
            save_video: 비디오 파일을 저장할지 여부
            
        Returns:
            (분석 결과 딕셔너리, 저장된 비디오 파일 경로)
        """
        saved_path = None
        try:
            # 비디오 파일 읽기
            video_bytes = await video_file.read()
            
            # 비디오 파일 저장 (필요한 경우)
            if save_video:
                from app.services.video_storage import VideoStorage
                storage = VideoStorage()
                # 파일 포인터를 처음으로 되돌림
                await video_file.seek(0)
                saved_path = await storage.save_video(video_file)
                # 다시 읽기 위해 포인터 초기화
                await video_file.seek(0)
                video_bytes = await video_file.read()
            
            # Base64 인코딩
            video_base64 = base64.b64encode(video_bytes).decode('utf-8')
            
            # 프롬프트 생성
            prompt = self._create_analysis_prompt()
            
            # Gemini API 호출
            response = self.model.generate_content([
                {
                    'mime_type': video_file.content_type,
                    'data': video_base64
                },
                prompt
            ])
            
            # 응답 파싱
            result_text = response.text.strip()
            
            # JSON 추출 (마크다운 코드 블록 제거)
            if result_text.startswith('```json'):
                result_text = result_text.replace('```json\n', '').replace('```', '')
            elif result_text.startswith('```'):
                result_text = result_text.replace('```\n', '').replace('```', '')
            
            # JSON 파싱
            analysis_data = json.loads(result_text)
            
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
            
            return result, saved_path
            
        except json.JSONDecodeError as e:
            raise ValueError(f"AI 응답을 파싱할 수 없습니다: {str(e)}")
        except Exception as e:
            raise Exception(f"비디오 분석 중 오류 발생: {str(e)}")

    async def analyze_for_daily_report(self, analysis_data: dict) -> dict:
        """
        비디오 분석 결과를 기반으로 일일 리포트 데이터를 생성합니다.
        
        Args:
            analysis_data: 비디오 분석 결과 딕셔너리
            
        Returns:
            리포트 데이터 딕셔너리
        """
        try:
            # 리포트 분석 프롬프트 로드
            prompt = self._load_prompt('daily_report_analysis_prompt.txt')
            
            # 분석 데이터를 JSON 문자열로 변환하여 프롬프트에 포함
            analysis_json = json.dumps(analysis_data, ensure_ascii=False, indent=2)
            full_prompt = f"{prompt}\n\n다음은 분석된 비디오 데이터입니다:\n\n{analysis_json}"
            
            # Gemini API 호출
            response = self.model.generate_content(full_prompt)
            
            # 응답 파싱
            result_text = response.text.strip()
            
            # JSON 추출 (마크다운 코드 블록 제거)
            if result_text.startswith('```json'):
                result_text = result_text.replace('```json\n', '').replace('```', '')
            elif result_text.startswith('```'):
                result_text = result_text.replace('```\n', '').replace('```', '')
            
            # JSON 파싱
            report_data = json.loads(result_text)
            
            return report_data
            
        except json.JSONDecodeError as e:
            raise ValueError(f"AI 응답을 파싱할 수 없습니다: {str(e)}")
        except Exception as e:
            raise Exception(f"리포트 분석 중 오류 발생: {str(e)}")

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

