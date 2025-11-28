"""
Analysis CRUD Operations
GeminiService의 분석 결과(JSON)를 파싱하여 DB에 저장하는 로직
"""

from sqlalchemy.orm import Session
from datetime import datetime, date
import json
import logging

from app.models.analysis import (
    AnalysisLog, 
    SafetyEvent, 
    DevelopmentEvent, 
    EventSeverity, 
    EventType, 
    DevelopmentCategory
)
from app.models.clip import HighlightClip, ClipCategory, ClipImportance

# 로깅 설정
logger = logging.getLogger(__name__)


def save_analysis_result(
    db: Session, 
    user_id: int, 
    video_path: str, 
    video_filename: str,
    ai_result: dict
) -> AnalysisLog:
    """
    AI 분석 결과(JSON)를 받아서 DB(AnalysisLog 및 하위 테이블)에 저장합니다.
    
    Args:
        db: DB 세션
        user_id: 사용자 ID
        video_path: 영상 파일 경로 (S3 또는 로컬 스토리지 경로)
        video_filename: 원본 파일명
        ai_result: GeminiService.analyze_video_vlm()의 리턴값 (Dict)
    
    Returns:
        생성된 AnalysisLog 객체 (ID 포함)
    """
    try:
        # 1. 데이터 추출 (KeyError 방지를 위해 .get 사용)
        meta = ai_result.get("meta", {})
        safety_data = ai_result.get("safety_analysis", {})
        dev_data = ai_result.get("development_analysis", {})
        
        # 2. AnalysisLog 생성 (부모 테이블)
        analysis_log = AnalysisLog(
            user_id=user_id,
            video_filename=video_filename,
            video_path=video_path,
            video_duration_seconds=meta.get("video_duration_seconds"),
            
            # 원본 JSON 저장 (선택 사항, 디버깅용으로 유용)
            analysis_result=ai_result,
            
            # 메타데이터 매핑
            assumed_stage=str(meta.get("assumed_stage", "")),
            age_months=meta.get("age_months"),
            
            # [Group A] 안전 분석 결과 매핑
            safety_score=safety_data.get("safety_score"),
            overall_safety_level=safety_data.get("overall_safety_level"),
            safety_summary=safety_data.get("safety_summary"),
            
            # [Group B] 발달 분석 결과 매핑
            development_score=dev_data.get("development_score"),
            main_activity=dev_data.get("main_activity"),
            development_summary=dev_data.get("development_summary"),
        )
        
        db.add(analysis_log)
        db.flush()  # ID 생성을 위해 flush (commit은 나중에 한 번에)
        
        # 3. SafetyEvent 저장 (자식 테이블 1 - 안전)
        incident_events = safety_data.get("incident_events", [])
        if incident_events:
            for event in incident_events:
                # Enum 변환 (실패 시 기본값 처리)
                try:
                    severity_enum = EventSeverity(event.get("severity"))
                except (ValueError, TypeError):
                    severity_enum = EventSeverity.WARNING  # 기본값

                try:
                    type_enum = EventType(event.get("event_type"))
                except (ValueError, TypeError):
                    type_enum = EventType.OTHER  # 기본값

                # 타임스탬프 파싱
                timestamp_str = str(event.get("timestamp_range", "")).split("-")[0].strip()
                event_dt = _parse_time_string(timestamp_str)
                
                safety_event = SafetyEvent(
                    user_id=user_id,
                    analysis_log_id=analysis_log.id,
                    severity=severity_enum,
                    event_type=type_enum,
                    description=event.get("description", ""),
                    timestamp_range=event.get("timestamp_range"),
                    event_timestamp=event_dt,
                    has_safety_device=event.get("has_safety_device", False),
                    estimated_outcome=event.get("estimated_outcome"),
                    resolved=event.get("resolved", False)
                )
                db.add(safety_event)

        # 4. DevelopmentEvent 저장 (자식 테이블 2 - 발달)
        dev_events = dev_data.get("development_events", [])
        if dev_events:
            for event in dev_events:
                try:
                    cat_enum = DevelopmentCategory(event.get("category"))
                except (ValueError, TypeError):
                    cat_enum = DevelopmentCategory.OTHER
                
                event_dt = _parse_time_string(str(event.get("event_timestamp", "")))
                
                dev_event = DevelopmentEvent(
                    user_id=user_id,
                    analysis_log_id=analysis_log.id,
                    category=cat_enum,
                    activity_name=event.get("activity_name", ""),
                    description=event.get("description", ""),
                    event_timestamp=event_dt,
                    is_highlight_candidate=event.get("is_highlight_candidate", False)
                )
                db.add(dev_event)
                
        # 5. HighlightClip 저장 (자식 테이블 3 - 하이라이트)
        highlight = dev_data.get("highlight_selection", {})
        if highlight and highlight.get("selected") is True:
            
            # 하이라이트는 보통 '발달' 카테고리로 분류
            clip_cat = ClipCategory.DEVELOPMENT 
            
            clip = HighlightClip(
                user_id=user_id,
                analysis_log_id=analysis_log.id,
                title=highlight.get("title", "오늘의 하이라이트"),
                description=highlight.get("reason", ""),
                category=clip_cat,
                importance=ClipImportance.HIGH,
                video_path=video_path,  # 추후 클립핑된 파일 경로로 업데이트 가능
                timestamp_start=highlight.get("timestamp_start"),
                timestamp_end=highlight.get("timestamp_end"),
                clip_timestamp=datetime.now()
            )
            db.add(clip)

        db.commit()
        db.refresh(analysis_log)
        logger.info(f"분석 결과 저장 완료: AnalysisLog ID {analysis_log.id}")
        return analysis_log

    except Exception as e:
        db.rollback()
        logger.error(f"분석 결과 저장 중 오류 발생: {str(e)}")
        raise e


def _parse_time_string(time_str: str) -> datetime:
    """
    'HH:MM:SS' 형식의 문자열을 받아 오늘의 날짜가 결합된 datetime 객체로 반환합니다.
    파싱 실패 시 현재 시간을 반환합니다.
    """
    if not time_str:
        return datetime.now()
        
    try:
        # 시간 형식이 'MM:SS'인 경우 '00:MM:SS'로 보정
        if len(time_str.split(":")) == 2:
            time_str = f"00:{time_str}"
            
        t = datetime.strptime(time_str, "%H:%M:%S").time()
        return datetime.combine(date.today(), t)
    except Exception:
        return datetime.now()
