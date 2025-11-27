"""Analysis API - 분석 결과 조회 엔드포인트"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import (
    VideoAnalysis, DevelopmentSkill, SkillExample,
    SafetyIncident, EnvironmentRisk, IncidentSummary,
    StageEvidence, AnalysisRawJson
)

router = APIRouter()


@router.get("/analyses")
async def get_analyses(
    child_id: int = Query(..., description="아이 ID"),
    limit: int = Query(10, description="조회 개수"),
    offset: int = Query(0, description="시작 위치"),
    db: Session = Depends(get_db)
) -> dict:
    """
    아이의 분석 결과 목록 조회
    
    - **child_id**: 아이 ID
    - **limit**: 조회 개수 (기본값: 10)
    - **offset**: 시작 위치 (기본값: 0)
    """
    # 전체 개수
    total = db.query(VideoAnalysis)\
        .filter(VideoAnalysis.child_id == child_id)\
        .count()
    
    # 목록 조회
    analyses = db.query(VideoAnalysis)\
        .filter(VideoAnalysis.child_id == child_id)\
        .order_by(VideoAnalysis.created_at.desc())\
        .offset(offset)\
        .limit(limit)\
        .all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": a.id,
                "child_id": a.child_id,
                "detected_stage": a.detected_stage,
                "assumed_stage": a.assumed_stage,
                "age_months": a.age_months,
                "safety_score": a.safety_score,
                "overall_safety_level": a.overall_safety_level.value if a.overall_safety_level else None,
                "match_level": a.match_level.value if a.match_level else None,
                "video_quality": a.video_quality,
                "environment_type": a.environment_type,
                "observation_duration_minutes": a.observation_duration_minutes,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in analyses
        ]
    }


@router.get("/analyses/{analysis_id}")
async def get_analysis_detail(
    analysis_id: int,
    include_raw_json: bool = Query(False, description="원본 JSON 포함 여부"),
    db: Session = Depends(get_db)
) -> dict:
    """
    특정 분석 결과 상세 조회
    
    - **analysis_id**: 분석 ID
    - **include_raw_json**: 원본 JSON 포함 여부 (기본값: False)
    """
    analysis = db.query(VideoAnalysis)\
        .filter(VideoAnalysis.id == analysis_id)\
        .first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # 기본 정보
    result = {
        "id": analysis.id,
        "child_id": analysis.child_id,
        "user_id": analysis.user_id,
        
        # 비디오 정보
        "video": {
            "file_path": analysis.video_file_path,
            "file_size": analysis.video_file_size,
            "duration_seconds": analysis.video_duration_seconds,
            "quality": analysis.video_quality,
            "child_visibility": analysis.child_visibility,
            "environment_type": analysis.environment_type
        },
        
        # 발달 단계
        "stage": {
            "detected_stage": analysis.detected_stage,
            "assumed_stage": analysis.assumed_stage,
            "confidence": analysis.stage_confidence,
            "age_months": analysis.age_months,
            "match_level": analysis.match_level.value if analysis.match_level else None,
            "suggested_next_stage": analysis.suggested_next_stage
        },
        
        # 안전
        "safety": {
            "score": analysis.safety_score,
            "level": analysis.overall_safety_level.value if analysis.overall_safety_level else None,
            "adult_presence": analysis.adult_presence.value if analysis.adult_presence else None
        },
        
        # 발달 분석
        "development": {
            "summary": analysis.development_summary,
            "skills": []
        },
        
        # 안전 분석
        "safety_incidents": [],
        "environment_risks": [],
        "incident_summaries": [],
        
        # 단계 판단 근거
        "stage_evidences": [],
        
        # 기타
        "observation_duration_minutes": analysis.observation_duration_minutes,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None
    }
    
    # 발달 기술
    for skill in analysis.skills:
        result["development"]["skills"].append({
            "name": skill.skill_name,
            "category": skill.category.value if skill.category else None,
            "present": skill.present,
            "frequency": skill.frequency,
            "level": skill.level.value if skill.level else None,
            "examples": [
                {
                    "timestamp": ex.timestamp,
                    "description": ex.example_description
                }
                for ex in skill.examples
            ]
        })
    
    # 안전 사고
    for incident in analysis.safety_incidents:
        result["safety_incidents"].append({
            "event_id": incident.event_id,
            "timestamp_start": incident.timestamp_start,
            "timestamp_end": incident.timestamp_end,
            "severity": incident.severity.value if incident.severity else None,
            "risk_type": incident.risk_type,
            "description": incident.description,
            "trigger_behavior": incident.trigger_behavior,
            "environment_factor": incident.environment_factor,
            "has_safety_device": incident.has_safety_device,
            "safety_device_type": incident.safety_device_type,
            "adult_intervention": incident.adult_intervention,
            "comment": incident.comment
        })
    
    # 환경 위험
    for risk in analysis.environment_risks:
        result["environment_risks"].append({
            "risk_id": risk.risk_id,
            "risk_type": risk.risk_type,
            "severity": risk.severity.value if risk.severity else None,
            "location": risk.location,
            "description": risk.description,
            "trigger_behavior": risk.trigger_behavior,
            "environment_factor": risk.environment_factor,
            "has_safety_device": risk.has_safety_device,
            "safety_device_type": risk.safety_device_type,
            "comment": risk.comment
        })
    
    # 사고 요약
    for summary in analysis.incident_summaries:
        result["incident_summaries"].append({
            "severity": summary.severity.value if summary.severity else None,
            "occurrences": summary.occurrences,
            "applied_deduction": summary.applied_deduction
        })
    
    # 단계 판단 근거
    for evidence in analysis.stage_evidences:
        result["stage_evidences"].append({
            "evidence_text": evidence.evidence_text,
            "alternative_stage": evidence.alternative_stage,
            "alternative_reason": evidence.alternative_reason
        })
    
    # 원본 JSON (옵션)
    if include_raw_json and analysis.raw_json:
        result["raw_json"] = {
            "vlm_metadata": analysis.raw_json.vlm_metadata_json,
            "stage_determination": analysis.raw_json.stage_determination_json,
            "final_analysis": analysis.raw_json.final_analysis_json
        }
    
    return result


@router.get("/analyses/{analysis_id}/skills")
async def get_analysis_skills(
    analysis_id: int,
    category: Optional[str] = Query(None, description="발달 영역 필터"),
    db: Session = Depends(get_db)
) -> List[dict]:
    """
    특정 분석의 발달 기술 목록 조회
    
    - **analysis_id**: 분석 ID
    - **category**: 발달 영역 필터 (선택)
    """
    query = db.query(DevelopmentSkill)\
        .filter(DevelopmentSkill.analysis_id == analysis_id)
    
    if category:
        query = query.filter(DevelopmentSkill.category == category)
    
    skills = query.all()
    
    return [
        {
            "id": skill.id,
            "skill_name": skill.skill_name,
            "category": skill.category.value if skill.category else None,
            "present": skill.present,
            "frequency": skill.frequency,
            "level": skill.level.value if skill.level else None,
            "examples": [
                {
                    "timestamp": ex.timestamp,
                    "description": ex.example_description
                }
                for ex in skill.examples
            ]
        }
        for skill in skills
    ]


@router.get("/analyses/{analysis_id}/safety")
async def get_analysis_safety(
    analysis_id: int,
    db: Session = Depends(get_db)
) -> dict:
    """
    특정 분석의 안전 분석 상세 조회
    
    - **analysis_id**: 분석 ID
    """
    analysis = db.query(VideoAnalysis)\
        .filter(VideoAnalysis.id == analysis_id)\
        .first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "analysis_id": analysis_id,
        "safety_score": analysis.safety_score,
        "overall_safety_level": analysis.overall_safety_level.value if analysis.overall_safety_level else None,
        "adult_presence": analysis.adult_presence.value if analysis.adult_presence else None,
        
        "incidents": [
            {
                "event_id": inc.event_id,
                "severity": inc.severity.value if inc.severity else None,
                "risk_type": inc.risk_type,
                "timestamp": f"{inc.timestamp_start}-{inc.timestamp_end}",
                "description": inc.description,
                "has_safety_device": inc.has_safety_device,
                "adult_intervention": inc.adult_intervention
            }
            for inc in analysis.safety_incidents
        ],
        
        "environment_risks": [
            {
                "risk_id": risk.risk_id,
                "risk_type": risk.risk_type,
                "severity": risk.severity.value if risk.severity else None,
                "location": risk.location,
                "description": risk.description,
                "has_safety_device": risk.has_safety_device
            }
            for risk in analysis.environment_risks
        ],
        
        "incident_summary": [
            {
                "severity": summary.severity.value if summary.severity else None,
                "occurrences": summary.occurrences,
                "applied_deduction": summary.applied_deduction
            }
            for summary in analysis.incident_summaries
        ]
    }


@router.get("/statistics/child/{child_id}")
async def get_child_statistics(
    child_id: int,
    db: Session = Depends(get_db)
) -> dict:
    """
    아이의 전체 분석 통계
    
    - **child_id**: 아이 ID
    """
    analyses = db.query(VideoAnalysis)\
        .filter(VideoAnalysis.child_id == child_id)\
        .all()
    
    if not analyses:
        return {
            "child_id": child_id,
            "total_analyses": 0,
            "average_safety_score": None,
            "stage_distribution": {},
            "latest_analysis": None
        }
    
    # 통계 계산
    total = len(analyses)
    safety_scores = [a.safety_score for a in analyses if a.safety_score is not None]
    avg_safety = sum(safety_scores) / len(safety_scores) if safety_scores else None
    
    # 단계별 분포
    stage_dist = {}
    for a in analyses:
        if a.detected_stage:
            stage_dist[a.detected_stage] = stage_dist.get(a.detected_stage, 0) + 1
    
    # 최신 분석
    latest = max(analyses, key=lambda a: a.created_at)
    
    return {
        "child_id": child_id,
        "total_analyses": total,
        "average_safety_score": round(avg_safety, 1) if avg_safety else None,
        "stage_distribution": stage_dist,
        "latest_analysis": {
            "id": latest.id,
            "detected_stage": latest.detected_stage,
            "safety_score": latest.safety_score,
            "created_at": latest.created_at.isoformat() if latest.created_at else None
        }
    }
