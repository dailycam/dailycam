"""하이라이트 영상 생성 서비스"""

import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import timedelta

try:
    from moviepy import VideoFileClip, TextClip, CompositeVideoClip
except ImportError:
    from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification


class HighlightGenerator:
    """하이라이트 영상 생성 클래스"""

    def __init__(self):
        """초기화"""
        self.video_storage_path = Path(__file__).parent.parent.parent.parent / "storage" / "videos"
        self.highlight_storage_path = Path(__file__).parent.parent.parent.parent / "storage" / "highlights"
        
        # 저장 디렉토리 생성
        self.video_storage_path.mkdir(parents=True, exist_ok=True)
        self.highlight_storage_path.mkdir(parents=True, exist_ok=True)
        
        # Bert 모델 초기화 (lazy loading)
        self._text_classifier = None
        self._tokenizer = None
        self._model = None

    def _load_bert_model(self):
        """Bert 모델 로드 (lazy loading)"""
        if self._text_classifier is None:
            try:
                # Pipeline 방식 (간단)
                self._text_classifier = pipeline(
                    "text-classification",
                    model="Josiah-Adesola/Bert-Streamlit-Finetune"
                )
            except Exception as e:
                print(f"Bert 모델 로드 실패 (pipeline): {e}")
                try:
                    # 직접 로드 방식
                    self._tokenizer = AutoTokenizer.from_pretrained(
                        "Josiah-Adesola/Bert-Streamlit-Finetune"
                    )
                    self._model = AutoModelForSequenceClassification.from_pretrained(
                        "Josiah-Adesola/Bert-Streamlit-Finetune"
                    )
                except Exception as e2:
                    print(f"Bert 모델 로드 실패 (direct): {e2}")
                    raise Exception("Bert 모델을 로드할 수 없습니다.")

    def classify_event_severity(self, description: str) -> str:
        """
        이벤트 설명을 기반으로 심각도를 분류합니다.
        
        Args:
            description: 이벤트 설명 (한글)
            
        Returns:
            "high", "medium", "low" 중 하나
        """
        try:
            self._load_bert_model()
            
            if self._text_classifier:
                result = self._text_classifier(description)
                # 모델 출력에 따라 심각도 매핑 (모델 출력 형식에 따라 조정 필요)
                label = result[0]['label'].lower()
                if 'high' in label or 'danger' in label or 'urgent' in label:
                    return "high"
                elif 'medium' in label or 'warning' in label:
                    return "medium"
                else:
                    return "low"
            else:
                # 모델이 없으면 기본값 반환
                return "medium"
        except Exception as e:
            print(f"심각도 분류 실패: {e}")
            return "medium"

    def parse_timestamp(self, timestamp_str: str) -> float:
        """
        타임스탬프 문자열을 초 단위로 변환합니다.
        
        Args:
            timestamp_str: "00:00:05" 또는 "00:05" 형식
            
        Returns:
            초 단위 시간
        """
        try:
            parts = timestamp_str.split(":")
            if len(parts) == 3:  # HH:MM:SS
                hours, minutes, seconds = map(int, parts)
                return hours * 3600 + minutes * 60 + seconds
            elif len(parts) == 2:  # MM:SS
                minutes, seconds = map(int, parts)
                return minutes * 60 + seconds
            else:
                return float(timestamp_str)
        except Exception as e:
            print(f"타임스탬프 파싱 실패: {e}")
            return 0.0

    def create_highlight_clip(
        self,
        video_path: str,
        start_time: float,
        end_time: float,
        event_description: str,
        event_type: str,
        output_path: str,
        volume_scale: float = 0.8
    ) -> str:
        """
        비디오에서 하이라이트 클립을 생성합니다.
        
        Args:
            video_path: 원본 비디오 파일 경로
            start_time: 시작 시간 (초)
            end_time: 종료 시간 (초)
            event_description: 이벤트 설명
            event_type: 이벤트 타입 (fall, danger, warning, safe)
            output_path: 출력 파일 경로
            volume_scale: 오디오 볼륨 스케일 (0.0 ~ 1.0)
            
        Returns:
            생성된 클립 파일 경로
        """
        try:
            # 비디오 클립 로드 및 편집
            # MoviePy 버전에 따라 API가 다를 수 있음
            try:
                # 최신 버전 (subclipped 사용)
                clip = (
                    VideoFileClip(video_path)
                    .subclipped(start_time, end_time)
                    .with_volume_scaled(volume_scale)
                )
            except AttributeError:
                # 구버전 (subclip 사용)
                clip = (
                    VideoFileClip(video_path)
                    .subclip(start_time, end_time)
                )
                if hasattr(clip, 'with_volume_scaled'):
                    clip = clip.with_volume_scaled(volume_scale)
                elif hasattr(clip, 'volumex'):
                    clip = clip.volumex(volume_scale)
            
            # 이벤트 타입에 따른 텍스트 색상 설정
            color_map = {
                "fall": "red",
                "danger": "orange",
                "warning": "yellow",
                "safe": "green"
            }
            text_color = color_map.get(event_type, "white")
            
            # 텍스트 클립 생성
            # MoviePy 버전에 따라 API가 다를 수 있음
            try:
                # 최신 버전 API
                txt_clip = TextClip(
                    text=event_description,
                    fontsize=40,
                    color=text_color,
                    font="Arial-Bold",
                    method="caption",
                    size=(int(clip.w * 0.9), None)
                ).with_duration(clip.duration).with_position(("center", "bottom")).with_margin(20)
            except Exception:
                # 구버전 호환
                txt_clip = TextClip(
                    txt=event_description,
                    fontsize=40,
                    color=text_color,
                    font="Arial-Bold"
                ).set_duration(clip.duration).set_position(("center", "bottom"))
            
            # 비디오와 텍스트 합성
            final_video = CompositeVideoClip([clip, txt_clip])
            
            # 파일 저장
            final_video.write_videofile(
                output_path,
                codec="libx264",
                audio_codec="aac",
                fps=24
            )
            
            # 리소스 정리
            clip.close()
            txt_clip.close()
            final_video.close()
            
            return output_path
        except Exception as e:
            raise Exception(f"하이라이트 클립 생성 실패: {str(e)}")

    def generate_highlights(
        self,
        video_path: str,
        timeline_events: List[Dict[str, Any]],
        clip_duration: int = 30
    ) -> List[Dict[str, Any]]:
        """
        타임라인 이벤트를 기반으로 하이라이트 영상들을 생성합니다.
        
        Args:
            video_path: 원본 비디오 파일 경로
            timeline_events: 타임라인 이벤트 리스트
            clip_duration: 각 클립의 길이 (초, 기본 30초)
            
        Returns:
            생성된 하이라이트 정보 리스트
        """
        highlights = []
        
        # 위험한 이벤트만 필터링 (safe 제외)
        dangerous_events = [
            event for event in timeline_events
            if event.get("type") != "safe"
        ]
        
        for idx, event in enumerate(dangerous_events):
            try:
                # 타임스탬프 파싱
                timestamp_str = event.get("timestamp", "00:00:00")
                start_time = self.parse_timestamp(timestamp_str)
                
                # 클립 시작 시간 조정 (이벤트 전 5초부터)
                clip_start = max(0, start_time - 5)
                clip_end = clip_start + clip_duration
                
                # 출력 파일 경로
                highlight_id = f"highlight_{idx + 1}_{event.get('type', 'event')}"
                output_filename = f"{highlight_id}.mp4"
                output_path = self.highlight_storage_path / output_filename
                
                # 하이라이트 클립 생성
                self.create_highlight_clip(
                    video_path=str(video_path),
                    start_time=clip_start,
                    end_time=clip_end,
                    event_description=event.get("description", ""),
                    event_type=event.get("type", "warning"),
                    output_path=str(output_path)
                )
                
                # 하이라이트 정보 저장
                highlight_info = {
                    "id": highlight_id,
                    "title": self._generate_title(event),
                    "timestamp": timestamp_str,
                    "duration": f"0:{clip_duration}",
                    "location": event.get("location", ""),
                    "severity": event.get("severity", "medium"),
                    "description": event.get("description", ""),
                    "video_url": f"/api/highlights/{output_filename}",
                    "thumbnail_url": None,  # 추후 썸네일 생성 추가 가능
                }
                
                highlights.append(highlight_info)
                
            except Exception as e:
                print(f"하이라이트 생성 실패 (이벤트 {idx + 1}): {e}")
                continue
        
        return highlights

    def _generate_title(self, event: Dict[str, Any]) -> str:
        """이벤트 정보를 기반으로 제목 생성"""
        event_type = event.get("type", "event")
        type_map = {
            "fall": "넘어짐",
            "danger": "위험 행동",
            "warning": "경고 상황",
            "safe": "안전 활동"
        }
        return type_map.get(event_type, "이벤트")

