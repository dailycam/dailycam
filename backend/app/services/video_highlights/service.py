"""Service layer for video highlights features."""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.video_highlights import (
    VideoHighlight,
    VideoHighlightsRequest,
    VideoHighlightsResponse,
)


@dataclass(slots=True)
class VideoHighlightsServiceConfig:
    """Configuration for video highlights service."""

    max_highlights: int = 5


class VideoHighlightsService:
    """Business logic for video highlights."""

    def __init__(self, config: VideoHighlightsServiceConfig) -> None:
        self._config = config

    async def list_highlights(self, payload: VideoHighlightsRequest) -> VideoHighlightsResponse:
        """
        비디오 하이라이트 목록을 반환합니다.
        
        현재는 DB가 없으므로 시뮬레이션 데이터를 반환합니다.
        향후 DB 연동 시 실제 비디오 분석 결과에서 하이라이트를 추출하여 반환하도록 수정 필요.
        """
        limit = payload.limit or self._config.max_highlights
        
        # 시뮬레이션 하이라이트 데이터
        # 실제로는 비디오 분석 결과의 timeline_events에서 위험한 이벤트를 추출해야 함
        highlights = [
            VideoHighlight(
                id="highlight-1",
                title="주방 데드존 접근",
                timestamp="오후 2:23",
                duration="0:32",
                location="주방 입구",
                severity="high",
                description="아이가 주방 가스레인지 근처에 접근했습니다.",
                ai_analysis="가스레인지 근처에서 약 15초간 머물렀습니다. 즉시 안전 게이트 설치를 권장합니다.",
            ),
            VideoHighlight(
                id="highlight-2",
                title="계단 입구 접근",
                timestamp="오전 11:30",
                duration="1:45",
                location="계단",
                severity="high",
                description="계단 안전 게이트 근처에서 약 2분간 활동했습니다.",
                ai_analysis="게이트를 흔드는 행동이 관찰되었습니다. 게이트 잠금 장치 점검이 필요합니다.",
            ),
            VideoHighlight(
                id="highlight-3",
                title="거실 테이블 모서리 근접",
                timestamp="오후 1:20",
                duration="0:18",
                location="거실",
                severity="medium",
                description="거실 테이블 모서리 근처에서 빠르게 이동했습니다.",
                ai_analysis="충돌 위험이 감지되었습니다. 모서리 보호대 추가를 권장합니다.",
            ),
        ]
        
        # 카메라 필터링 (향후 구현)
        if payload.camera_id:
            # 실제로는 camera_id로 필터링
            pass
        
        # 제한 적용
        highlights = highlights[:limit]
        
        return VideoHighlightsResponse(
            highlights=highlights,
            limit=limit,
        )


def get_video_highlights_service() -> VideoHighlightsService:
    """FastAPI dependency injector for VideoHighlightsService."""
    config = VideoHighlightsServiceConfig()
    return VideoHighlightsService(config=config)


