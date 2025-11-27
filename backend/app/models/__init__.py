"""Models package - SQLAlchemy models"""

# Import Base and engine
from app.database import Base, engine

# Import all models (순서 중요! 의존성 순서대로)
from app.models.user import User
from app.models.child import Child
from app.models.video_analysis import VideoAnalysis
from app.models.development_skill import DevelopmentSkill, SkillExample
from app.models.safety import SafetyIncident, EnvironmentRisk, IncidentSummary
from app.models.stage_evidence import StageEvidence
from app.models.raw_json import AnalysisRawJson

# 기존 모델들
from app.models.token_blacklist import TokenBlacklist

__all__ = [
    "Base",
    "engine",
    "User",
    "Child",
    "VideoAnalysis",
    "DevelopmentSkill",
    "SkillExample",
    "SafetyIncident",
    "EnvironmentRisk",
    "IncidentSummary",
    "StageEvidence",
    "AnalysisRawJson",
    "TokenBlacklist",
]


def create_all_tables():
    """모든 테이블 생성"""
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully!")


def drop_all_tables():
    """모든 테이블 삭제 (주의!)"""
    print("⚠️  WARNING: Dropping all database tables...")
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped!")
