"""비디오 분석 스키마"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class TimelineEvent(BaseModel):
    """타임라인 이벤트"""
    timestamp: str = Field(..., description="이벤트 발생 시간 (예: 00:00:05)")
    type: Literal["fall", "danger", "warning", "safe"] = Field(..., description="이벤트 타입")
    description: str = Field(..., description="이벤트 설명 (한글)")
    severity: Literal["high", "medium", "low"] = Field(..., description="심각도")


class VideoAnalysisResponse(BaseModel):
    """비디오 분석 응답"""
    total_incidents: int = Field(..., description="전체 사건 수")
    falls: int = Field(..., description="넘어짐 횟수")
    dangerous_actions: int = Field(..., description="위험한 행동 횟수")
    safety_score: int = Field(..., ge=0, le=100, description="안전도 점수 (0-100)")
    timeline_events: List[TimelineEvent] = Field(default_factory=list, description="타임라인 이벤트 목록")
    summary: str = Field(..., description="전체 요약 (한글)")
    recommendations: List[str] = Field(default_factory=list, description="안전 개선 추천 사항 (한글)")
    analysis_id: Optional[int] = Field(None, description="분석 ID (DB 저장 후 생성)")
    video_id: Optional[int] = Field(None, description="비디오 ID (DB 저장 후 생성)")
    video_path: Optional[str] = Field(None, description="비디오 파일 경로")

    class Config:
        json_schema_extra = {
            "example": {
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
                    }
                ],
                "summary": "대체로 안전하나 1회 넘어짐이 감지되었습니다",
                "recommendations": [
                    "소파 주변에 안전 매트를 설치하세요",
                    "아이가 높은 곳에서 내려올 때 보호자가 지켜봐 주세요"
                ]
            }
        }

