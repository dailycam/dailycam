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
        # HighlightClip 자동 생성 (이벤트 기반)
        # ============================================================
        # 사용자의 요청에 따라 특정 조건의 이벤트만 클립으로 저장합니다.
        
        # 1. 안전 이벤트 처리 (사고/위험/주의)
        # VLM의 safety_events 리스트를 순회하며 클립 생성
        for event_data in safety_events_data:
            severity_str = event_data.get("severity", "권장")
            
            # 클립 생성 조건: 사고/위험/주의 단계일 때만 (권장 제외)
            if severity_str in ["사고", "사고발생", "위험", "주의"]:
                # timestamp_range 파싱
                duration_seconds = 0
                timestamp_range = event_data.get("timestamp_range", "")
                if timestamp_range and "-" in timestamp_range:
                    try:
                        start_str, end_str = timestamp_range.split("-")
                        def time_to_seconds(time_str):
                            parts = time_str.strip().split(":")
                            if len(parts) == 3:
                                h, m, s = map(int, parts)
                                return h * 3600 + m * 60 + s
                            return 0
                        duration_seconds = time_to_seconds(end_str) - time_to_seconds(start_str)
                    except:
                        pass
                
                # 중요도 매핑
                importance_map = {
                    "사고": "high", "사고발생": "high",
                    "위험": "high",
                    "주의": "warning",
                    "권장": "medium"
                }
                
                # 썸네일 생성
                thumbnail_url = ""
                # 시작 시간 계산 (초)
                start_seconds = 0
                if timestamp_range and "-" in timestamp_range:
                    try:
                        start_str = timestamp_range.split("-")[0].strip()
                        parts = start_str.split(":")
                        if len(parts) == 3:
                            start_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                    except:
                        pass
                
                # 썸네일 파일 경로 설정 (public/thumbnails/...)
                # Docker 내부 경로 기준: /app/videos/... -> /app/videos/thumbnails/...
                # video_path 예: /app/videos/camera-1/short/video.mp4
                try:
                    video_dir = os.path.dirname(video_path)
                    video_name = os.path.basename(video_path)
                    thumb_filename = f"thumb_{video_name}_{start_seconds}_{severity_str}.jpg"
                    thumb_path = os.path.join(video_dir, "thumbnails", thumb_filename)
                    
                    # 실제 생성 실행 (시작 시간에서 1초 뒤 장면 추출)
                    if AnalysisService._generate_thumbnail(video_path, thumb_path, start_seconds + 1):
                         # DB에 저장할 URL
                         # thumb_path: /app/videos/camera-1/thumbnails/thumb.jpg
                         # URL: /videos/camera-1/thumbnails/thumb.jpg
                         if thumb_path.startswith("/app/videos"):
                             thumbnail_url = thumb_path.replace("/app/videos", "/videos")
                         elif "videos" in thumb_path:
                             # 윈도우 등 기타 환경 대응
                             try:
                                 # videos 디렉토리 뒷부분만 따서 URL화
                                 rel_path = thumb_path[thumb_path.find("videos"):]
                                 thumbnail_url = "/" + rel_path.replace("\\", "/")
                                 if thumbnail_url.startswith("/videos/videos"): # 중복 방지
                                     thumbnail_url = thumbnail_url.replace("/videos/videos", "/videos")
                             except:
                                 pass
                except Exception as e:
                    print(f"⚠️ 썸네일 경로 설정 실패: {e}")

                safety_clip = HighlightClip(
                    title=f"[안전] {event_data.get('title', '안전 이벤트')}",
                    description=event_data.get("description"),
                    video_url=web_video_url,  # 웹 접근 가능한 URL 사용
                    thumbnail_url=thumbnail_url,
                    category=ClipCategory.SAFETY,
                    sub_category=severity_str,
                    importance=importance_map.get(severity_str, "medium"),
                    duration_seconds=duration_seconds,
                    analysis_log_id=analysis_log.id
                )
                db.add(safety_clip)
                print(f"🎬 [Clip] 안전 클립 생성됨: {safety_clip.title} ({severity_str})")

        # 2. 발달 이벤트 처리 (최초발생/다음단계징후)
        
        # (A) 일반 발달 이벤트 중 '최초' 키워드가 있는 경우
        for event_data in development_events_data:
            title = event_data.get("title", "")
            description = event_data.get("description", "")
            
            # 단순 키워드 매칭으로 '최초' 감지
            # TODO: 프롬프트 개선을 통해 flags 필드를 추가하면 더 정확해짐
            is_new_skill = any(keyword in title for keyword in ["최초", "처음", "성공", "새로운"])
            
            if is_new_skill:
                # 발달 썸네일 (이벤트 발생 시점은 보통 앞부분)
                thumbnail_url = ""
                try:
                    video_dir = os.path.dirname(video_path)
                    video_name = os.path.basename(video_path)
                    # 발달은 정확한 타임스탬프가 없을 수 있으므로 5초 지점(또는 10%) 추출
                    # TODO: DevelopmentEvent에도 timestamp_range가 있으면 그걸 써야 함
                    capture_time = 5 
                    thumb_filename = f"thumb_{video_name}_dev_{title[:5]}.jpg"
                    thumb_path = os.path.join(video_dir, "thumbnails", thumb_filename)
                    
                    if AnalysisService._generate_thumbnail(video_path, thumb_path, capture_time):
                        if thumb_path.startswith("/app/videos"):
                            thumbnail_url = thumb_path.replace("/app/videos", "/videos")
                        elif "videos" in thumb_path:
                            try:
                                rel_path = thumb_path[thumb_path.find("videos"):]
                                thumbnail_url = "/" + rel_path.replace("\\", "/")
                                if thumbnail_url.startswith("/videos/videos"):
                                     thumbnail_url = thumbnail_url.replace("/videos/videos", "/videos")
                            except:
                                pass
                except:
                    pass

                dev_clip = HighlightClip(
                    title=f"[발달] {title}",
                    description=description,
                    video_url=web_video_url,
                    thumbnail_url=thumbnail_url,
                    category=ClipCategory.DEVELOPMENT,
                    sub_category="최초발생",
                    importance="high",  # 발달 이정표는 중요함
                    analysis_log_id=analysis_log.id
                )
                db.add(dev_clip)
                print(f"🎬 [Clip] 발달 클립(최초) 생성됨: {title}")

        # (B) 다음 단계 징후 (next_stage_signs) 처리
        next_stage_signs = development_analysis.get("next_stage_signs", [])
        for sign_data in next_stage_signs:
            # sign_data 구조: { "name": ..., "present": true/false, ... }
            if sign_data.get("present") is True:
                # 발달 징후 썸네일
                thumbnail_url = ""
                try:
                    video_dir = os.path.dirname(video_path)
                    video_name = os.path.basename(video_path)
                    thumb_filename = f"thumb_{video_name}_sign_{sign_data.get('name', 'sign')[:5]}.jpg"
                    thumb_path = os.path.join(video_dir, "thumbnails", thumb_filename)
                    if AnalysisService._generate_thumbnail(video_path, thumb_path, 10): # 10초 지점
                        if thumb_path.startswith("/app/videos"):
                            thumbnail_url = thumb_path.replace("/app/videos", "/videos")
                        elif "videos" in thumb_path:
                            try:
                                rel_path = thumb_path[thumb_path.find("videos"):]
                                thumbnail_url = "/" + rel_path.replace("\\", "/")
                                if thumbnail_url.startswith("/videos/videos"):
                                     thumbnail_url = thumbnail_url.replace("/videos/videos", "/videos")
                            except:
                                pass
                except:
                    pass

                sign_clip = HighlightClip(
                    title=f"[발달징후] {sign_data.get('name', '다음 단계 징후')}",
                    description=sign_data.get('comment', '다음 발달 단계의 징후가 관찰되었습니다.'),
                    video_url=web_video_url,
                    thumbnail_url=thumbnail_url,
                    category=ClipCategory.DEVELOPMENT,
                    sub_category="다음단계징후",
                    importance="medium",
                    analysis_log_id=analysis_log.id
                )
                db.add(sign_clip)
                print(f"🎬 [Clip] 발달 클립(징후) 생성됨: {sign_clip.title}")
        
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
