"""JSON to Database Mapper - Gemini JSON을 DB에 저장하는 헬퍼"""

import json
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import (
    VideoAnalysis, DevelopmentSkill, SkillExample,
    SafetyIncident, EnvironmentRisk, IncidentSummary,
    StageEvidence, AnalysisRawJson
)


class JsonToDbMapper:
    """Gemini 분석 결과 JSON을 DB에 매핑"""
    
    @staticmethod
    def save_analysis_to_db(
        db: Session,
        child_id: int,
        user_id: int,
        analysis_data: Dict[str, Any],
        video_file_path: Optional[str] = None,
        video_file_size: Optional[int] = None
    ) -> VideoAnalysis:
        """
        Gemini 분석 결과 JSON을 DB에 저장
        
        Args:
            db: 데이터베이스 세션
            child_id: 아이 ID
            user_id: 사용자 ID
            analysis_data: Gemini 최종 분석 결과 JSON
            video_file_path: 비디오 파일 경로
            video_file_size: 비디오 파일 크기
            
        Returns:
            VideoAnalysis: 저장된 비디오 분석 객체
        """
        # 1. VideoAnalysis 메인 레코드 생성
        meta = analysis_data.get("meta", {})
        stage_det = analysis_data.get("stage_determination", {})
        dev_analysis = analysis_data.get("development_analysis", {})
        safety = analysis_data.get("safety_analysis", {})
        stage_consistency = analysis_data.get("stage_consistency", {})
        extracted_meta = analysis_data.get("_extracted_metadata", {})
        video_meta = extracted_meta.get("video_metadata", {})
        
        video_analysis = VideoAnalysis(
            child_id=child_id,
            user_id=user_id,
            
            # 비디오 정보
            video_file_path=video_file_path,
            video_file_size=video_file_size,
            video_duration_seconds=video_meta.get("total_duration_seconds"),
            video_quality=video_meta.get("video_quality"),
            child_visibility=video_meta.get("child_visibility"),
            environment_type=video_meta.get("environment_type"),
            
            # 발달 단계
            detected_stage=stage_det.get("detected_stage"),
            assumed_stage=str(meta.get("assumed_stage")) if meta.get("assumed_stage") is not None else None,
            stage_confidence=stage_det.get("confidence"),
            age_months=meta.get("age_months"),
            
            # 단계 일치도
            match_level=stage_consistency.get("match_level"),
            suggested_next_stage=stage_consistency.get("suggested_stage_for_next_analysis"),
            
            # 안전
            safety_score=safety.get("safety_score"),
            overall_safety_level=safety.get("overall_safety_level"),
            adult_presence=safety.get("adult_presence"),
            
            # 발달 요약
            development_summary=dev_analysis.get("summary"),
            
            # 관찰 시간
            observation_duration_minutes=meta.get("observation_duration_minutes"),
            
            # 타임스탬프
            analysis_completed_at=datetime.now()
        )
        
        db.add(video_analysis)
        db.flush()  # ID 생성을 위해 flush
        
        # 2. 발달 기술 저장
        JsonToDbMapper._save_development_skills(db, video_analysis.id, dev_analysis.get("skills", []))
        
        # 3. 단계 판단 근거 저장
        JsonToDbMapper._save_stage_evidences(db, video_analysis.id, stage_det)
        
        # 4. 안전 사고 저장
        JsonToDbMapper._save_safety_incidents(db, video_analysis.id, safety.get("incident_events", []))
        
        # 5. 환경 위험 저장
        JsonToDbMapper._save_environment_risks(db, video_analysis.id, safety.get("environment_risks", []))
        
        # 6. 사고 요약 저장
        JsonToDbMapper._save_incident_summaries(db, video_analysis.id, safety.get("incident_summary", []))
        
        # 7. 원본 JSON 저장
        JsonToDbMapper._save_raw_json(db, video_analysis.id, analysis_data)
        
        db.commit()
        db.refresh(video_analysis)
        
        return video_analysis
    
    @staticmethod
    def _save_development_skills(db: Session, analysis_id: int, skills: list):
        """발달 기술 저장"""
        for skill_data in skills:
            skill = DevelopmentSkill(
                analysis_id=analysis_id,
                skill_name=skill_data.get("name"),
                category=skill_data.get("category"),
                present=skill_data.get("present", False),
                frequency=skill_data.get("frequency", 0),
                level=skill_data.get("level", "없음")
            )
            db.add(skill)
            db.flush()
            
            # 예시 저장
            for example_text in skill_data.get("examples", []):
                # 타임스탬프 추출 (예: "00:00:00 - 설명" 형식)
                timestamp = None
                if " - " in example_text:
                    parts = example_text.split(" - ", 1)
                    if len(parts[0]) <= 20:  # 타임스탬프로 보임
                        timestamp = parts[0].strip()
                
                example = SkillExample(
                    skill_id=skill.id,
                    timestamp=timestamp,
                    example_description=example_text
                )
                db.add(example)
    
    @staticmethod
    def _save_stage_evidences(db: Session, analysis_id: int, stage_det: dict):
        """단계 판단 근거 저장"""
        # 주요 근거들
        for evidence_text in stage_det.get("evidence", []):
            evidence = StageEvidence(
                analysis_id=analysis_id,
                evidence_text=evidence_text
            )
            db.add(evidence)
        
        # 대안 단계
        for alt in stage_det.get("alternative_stages", []):
            if isinstance(alt, dict):
                evidence = StageEvidence(
                    analysis_id=analysis_id,
                    evidence_text=f"대안 단계: {alt.get('stage')}",
                    alternative_stage=alt.get("stage"),
                    alternative_reason=alt.get("reason")
                )
                db.add(evidence)
    
    @staticmethod
    def _save_safety_incidents(db: Session, analysis_id: int, incidents: list):
        """안전 사고 저장"""
        for inc_data in incidents:
            # timestamp_range 파싱
            timestamp_range = inc_data.get("timestamp_range", "")
            timestamp_start = None
            timestamp_end = None
            if "-" in timestamp_range:
                parts = timestamp_range.split("-")
                if len(parts) == 2:
                    timestamp_start = parts[0].strip()
                    timestamp_end = parts[1].strip()
            
            incident = SafetyIncident(
                analysis_id=analysis_id,
                event_id=inc_data.get("event_id"),
                timestamp_start=timestamp_start,
                timestamp_end=timestamp_end,
                severity=inc_data.get("severity"),
                risk_type=inc_data.get("risk_type"),
                description=inc_data.get("description"),
                trigger_behavior=inc_data.get("trigger_behavior"),
                environment_factor=inc_data.get("environment_factor"),
                has_safety_device=inc_data.get("has_safety_device", False),
                safety_device_type=inc_data.get("safety_device_type"),
                adult_intervention=inc_data.get("adult_intervention", False),
                comment=inc_data.get("comment")
            )
            db.add(incident)
    
    @staticmethod
    def _save_environment_risks(db: Session, analysis_id: int, risks: list):
        """환경 위험 저장"""
        for risk_data in risks:
            risk = EnvironmentRisk(
                analysis_id=analysis_id,
                risk_id=risk_data.get("risk_id"),
                risk_type=risk_data.get("risk_type"),
                severity=risk_data.get("severity"),
                location=risk_data.get("location"),
                description=risk_data.get("description"),
                trigger_behavior=risk_data.get("trigger_behavior"),
                environment_factor=risk_data.get("environment_factor"),
                has_safety_device=risk_data.get("has_safety_device", False),
                safety_device_type=risk_data.get("safety_device_type"),
                comment=risk_data.get("comment")
            )
            db.add(risk)
    
    @staticmethod
    def _save_incident_summaries(db: Session, analysis_id: int, summaries: list):
        """사고 요약 저장"""
        for summary_data in summaries:
            summary = IncidentSummary(
                analysis_id=analysis_id,
                severity=summary_data.get("severity"),
                occurrences=summary_data.get("occurrences", 0),
                applied_deduction=summary_data.get("applied_deduction", 0)
            )
            db.add(summary)
    
    @staticmethod
    def _save_raw_json(db: Session, analysis_id: int, full_data: dict):
        """원본 JSON 저장"""
        # _extracted_metadata를 vlm_metadata로, stage_determination을 별도로 저장
        vlm_metadata = full_data.get("_extracted_metadata")
        stage_determination = full_data.get("stage_determination")
        
        raw_json = AnalysisRawJson(
            analysis_id=analysis_id,
            vlm_metadata_json=json.dumps(vlm_metadata, ensure_ascii=False) if vlm_metadata else None,
            stage_determination_json=json.dumps(stage_determination, ensure_ascii=False) if stage_determination else None,
            final_analysis_json=json.dumps(full_data, ensure_ascii=False)
        )
        db.add(raw_json)
