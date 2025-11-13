"""Analytics 데이터베이스 모델 - MariaDB용"""

from sqlalchemy import Column, Integer, String, Date, Float, DateTime, Text, DECIMAL
from sqlalchemy.sql import func
from app.database import Base


class DailyStat(Base):
    """일별 통계"""
    __tablename__ = "daily_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    safety_score = Column(Integer, nullable=False, comment='안전도 점수 (0-100)')
    incident_count = Column(Integer, default=0, comment='위험 감지 건수')
    activity_level = Column(Integer, nullable=False, comment='활동량 (0-100)')
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = {
        'mysql_engine': 'InnoDB',
        'mysql_charset': 'utf8mb4',
        'mysql_collate': 'utf8mb4_unicode_ci',
        'comment': '일별 통계 테이블'
    }


class Incident(Base):
    """위험 이벤트"""
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_type = Column(String(50), nullable=False, index=True, comment='위험 유형')
    occurred_date = Column(Date, nullable=False, index=True, comment='발생 날짜')
    description = Column(Text, comment='상세 설명')
    severity = Column(String(20), default='medium', comment='심각도: high/medium/low')
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = {
        'mysql_engine': 'InnoDB',
        'mysql_charset': 'utf8mb4',
        'mysql_collate': 'utf8mb4_unicode_ci',
        'comment': '위험 이벤트 테이블'
    }


class AnalyticsSummary(Base):
    """통계 요약 (캐시)"""
    __tablename__ = "analytics_summary"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    period = Column(String(20), nullable=False, comment='기간: week/month/year')
    avg_safety_score = Column(DECIMAL(5, 2), comment='평균 안전도')
    total_incidents = Column(Integer, comment='총 위험 건수')
    safe_zone_percentage = Column(DECIMAL(5, 2), comment='세이프존 체류율')
    incident_reduction_percentage = Column(DECIMAL(5, 2), comment='위험 감소율')
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = {
        'mysql_engine': 'InnoDB',
        'mysql_charset': 'utf8mb4',
        'mysql_collate': 'utf8mb4_unicode_ci',
        'comment': '통계 요약 테이블'
    }

