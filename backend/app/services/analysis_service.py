"""분석 결과를 데이터베이스에 저장하는 서비스"""

import json
from datetime import datetime
from typing import Dict, Optional
from sqlalchemy.orm import Session

from app.models.analysis import AnalysisLog, SafetyEvent, DevelopmentEvent, SeverityLevel, DevelopmentCategory
from app.models.clip import HighlightClip, ClipCategory

import os
import subprocess
from pathlib import Path

class AnalysisService:
    """분석 결과 저장 서비스"""
    
    @staticmethod
    def _generate_thumbnail(video_path: str, output_path: str, time_offset: int = 0) -> str:
        """FFmpeg를 사용하여 비디오에서 썸네일 추출"""
        try:
            # 윈도우 환경 등에서 FFmpeg 경로 문제 생길 수 있으므로 절대 경로 확인 또는 환경 변수 의존
            # Docker 내부에서는 ffmpeg가 PATH에 있음
            
            # 썸네일 저장 디렉토리 생성
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # 이미 존재하면 건너뜀 (중복 생성 방지)
            if os.path.exists(output_path):
                return output_path

            # FFmpeg 명령어: 해당 시간(-ss)의 프레임 하나(-vframes 1)를 추출
            # -y: 덮어쓰기 허용
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(time_offset),
                "-i", video_path,
                "-vframes", "1",
                "-q:v", "5",  # 품질 (1-31, 낮을수록 좋음)
                output_path
            ]
            
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return output_path
        except Exception as e:
            print(f"❌ 썸네일 생성 실패: {e}")
            return ""

    @staticmethod
    def save_analysis_result(
        db: Session,
        user_id: int,
        video_path: str,
        analysis_result: Dict,
        analysis_id: Optional[int] = None
    ) -> AnalysisLog:
        """
        분석 결과를 데이터베이스에 저장
        
        Args:
            db: 데이터베이스 세션
            user_id: 사용자 ID
            video_path: 비디오 파일 경로
            analysis_result: Gemini 분석 결과 JSON
            analysis_id: 분석 ID (None이면 자동 생성)
        
        Returns:
            생성된 AnalysisLog 객체
        """
        # AnalysisLog 생성
        meta = analysis_result.get("meta", {})
        safety_analysis = analysis_result.get("safety_analysis", {})
        development_analysis = analysis_result.get("development_analysis", {})
        
        # analysis_id가 없으면 현재 시간 기반으로 생성
        if analysis_id is None:
            analysis_id = int(datetime.now().timestamp())
        
        # development_score 계산 (VLM이 제공하지 않으면 radar_scores의 평균 사용)
        dev_score = development_analysis.get("development_score")
        if dev_score is None:
            # development_radar_scores가 있으면 평균 계산
            radar_scores = development_analysis.get("development_radar_scores", {})
            if radar_scores and isinstance(radar_scores, dict):
                scores = [v for v in radar_scores.values() if isinstance(v, (int, float))]
                if scores:
                    dev_score = int(sum(scores) / len(scores))
                    print(f"📊 development_score 자동 계산: {dev_score} (radar_scores 평균)")
        
        # AnalysisLog 레코드 생성
        analysis_log = AnalysisLog(
            analysis_id=analysis_id,
            user_id=user_id,
            video_path=video_path,
            age_months=meta.get("age_months"),
            assumed_stage=meta.get("assumed_stage"),
            safety_score=safety_analysis.get("safety_score"),
            overall_safety_level=safety_analysis.get("overall_safety_level"),
            safety_summary=safety_analysis.get("safety_summary"),
            safety_insights=safety_analysis.get("safety_insights"), # 추가
            development_score=dev_score,
            main_activity=development_analysis.get("main_activity"),
            development_summary=development_analysis.get("summary"),
            development_radar_scores=development_analysis.get("development_radar_scores"),
            recommendations=analysis_result.get("recommendations", []),
            development_insights=development_analysis.get("development_insights", []), # 추가
        )
        
        db.add(analysis_log)
        db.flush()  # ID를 얻기 위해 flush
        # ============================================================
        # video_path를 웹 접근 가능한 URL로 변환
        # Docker 내부 경로: /app/videos/... -> 웹 경로: /videos/...
        # ============================================================
        web_video_url = video_path
        if video_path.startswith("/app/videos"):
            web_video_url = video_path.replace("/app/videos", "/videos")
        elif video_path.startswith("videos"): # 상대 경로일 경우
             web_video_url = "/" + video_path
        
        # 윈도우 로컬 테스트 환경 대응 (c:\Users... -> /videos/...)
        if "videos" in video_path and "\\" in video_path:
             # 윈도우 경로를 분리해서 videos 이후 부분만 추출
             try:
                 parts = video_path.split("videos")
                 if len(parts) > 1:
                     web_video_url = "/videos" + parts[1].replace("\\", "/")
             except:
                 pass

        
        # SafetyEvent 저장
        safety_events_data = safety_analysis.get("safety_events", [])
        for event_data in safety_events_data:
            # severity 값 매핑 ("사고" -> "위험", "위험" -> "위험", "주의" -> "주의", "권장" -> "권장")
            severity_str = event_data.get("severity", "권장")
            if severity_str == "사고":
                severity_str = "위험"  # "사고"는 "위험"으로 매핑
            
            try:
                severity = SeverityLevel(severity_str)
            except ValueError:
                # 알 수 없는 값이면 "권장"으로 기본값 설정
                severity = SeverityLevel.RECOMMENDED
                print(f"⚠️ 알 수 없는 severity 값: {severity_str}, '권장'으로 설정")
            
            safety_event = SafetyEvent(
                analysis_log_id=analysis_log.id,
                severity=severity,
                title=event_data.get("title", ""),
                description=event_data.get("description"),
                location=event_data.get("location"),
                timestamp_range=event_data.get("timestamp_range"),
                resolved=event_data.get("resolved", False),
            )
            db.add(safety_event)
        
        # DevelopmentEvent 저장
        development_events_data = development_analysis.get("development_events", [])
        for event_data in development_events_data:
            category_str = event_data.get("category", "운동")
            
            # 한글 카테고리 매핑
            category_map = {
                "대근육": DevelopmentCategory.GROSS_MOTOR,
                "소근육": DevelopmentCategory.FINE_MOTOR,
                "대근육운동": DevelopmentCategory.GROSS_MOTOR,
                "소근육운동": DevelopmentCategory.FINE_MOTOR,
                "언어": DevelopmentCategory.LANGUAGE,
                "인지": DevelopmentCategory.COGNITIVE,
                "사회성": DevelopmentCategory.SOCIAL,
                "정서": DevelopmentCategory.SOCIAL,  # "사회정서"로 통합
                "사회정서": DevelopmentCategory.SOCIAL,
                "적응": DevelopmentCategory.SOCIAL,  # "사회정서"로 통합
            }
            
            if category_str in category_map:
                category = category_map[category_str]
            else:
                try:
                    category = DevelopmentCategory(category_str)
                except ValueError:
                    # 알 수 없는 값이면 "운동"으로 기본값 설정
                    category = DevelopmentCategory.MOTOR
                    print(f"⚠️ 알 수 없는 category 값: {category_str}, '운동'으로 설정")
            
            development_event = DevelopmentEvent(
                analysis_log_id=analysis_log.id,
                category=category,
                title=event_data.get("title", ""),
                description=event_data.get("description"),
                is_sleep=event_data.get("is_sleep", False),
            )
            db.add(development_event)
        
        # ============================================================
        # HighlightClip 자동 생성은 analysis_worker.py에서 처리됨
        # HighlightClipService.create_clips_from_segment_analysis() 사용
        # 
        # 구버전 로직 (아카이브 참조) 제거됨 - 2025-12-08
        # 신버전은 FFmpeg로 실제 클립 파일 생성
        # ============================================================
        
        db.commit()
        db.refresh(analysis_log)
        
        # ============================================================
        # 발달 점수 추적 업데이트 (누적 시스템)
        # ============================================================
        try:
            from app.services.development_tracking_service import DevelopmentTrackingService
            DevelopmentTrackingService.update_scores_from_analysis(
                db=db,
                user_id=user_id,
                analysis_result=analysis_result
            )
        except Exception as e:
            print(f"⚠️ 발달 점수 추적 업데이트 실패: {e}")
            # 실패해도 분석 로그는 저장됨
        
        return analysis_log
    
    @staticmethod
    def get_analysis_by_id(db: Session, analysis_id: int) -> Optional[AnalysisLog]:
        """분석 ID로 분석 결과 조회"""
        return db.query(AnalysisLog).filter(AnalysisLog.analysis_id == analysis_id).first()
    
    @staticmethod
    def get_user_analyses(db: Session, user_id: int, limit: int = 10):
        """사용자의 최근 분석 결과 조회"""
        return (
            db.query(AnalysisLog)
            .filter(AnalysisLog.user_id == user_id)
            .order_by(AnalysisLog.created_at.desc())
            .limit(limit)
            .all()
        )
