"""Live monitoring database models"""

from sqlalchemy import Column, Integer, String, DateTime, JSON, Float, Boolean, Text
from datetime import datetime
from app.database.base import Base


class RealtimeEvent(Base):
    """실시간 이벤트 (간단한 탐지 결과)"""
    __tablename__ = "realtime_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(50), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    event_type = Column(String(50), nullable=False)  # 'safety' | 'development'
    severity = Column(String(20))  # 'danger' | 'warning' | 'info' | 'safe'
    title = Column(String(200))
    description = Column(Text)
    location = Column(String(100))
    event_metadata = Column(JSON)  # 추가 정보 (위치 좌표, 행동 유형 등)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<RealtimeEvent(id={self.id}, camera={self.camera_id}, type={self.event_type}, severity={self.severity})>"


class HourlyAnalysis(Base):
    """1시간 단위 상세 분석 결과 (레거시, 하위 호환용)"""
    __tablename__ = "hourly_analyses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(50), nullable=False, index=True)
    hour_start = Column(DateTime, nullable=False, index=True)  # 해당 시간대 시작
    hour_end = Column(DateTime, nullable=False)    # 해당 시간대 종료
    video_path = Column(String(500))  # 분석한 비디오 파일 경로
    s3_url = Column(String(500))  # S3 URL (선택사항)
    analysis_result = Column(JSON)  # GeminiService.analyze_video_vlm()의 전체 결과
    status = Column(String(20), default='pending')  # 'pending' | 'processing' | 'completed' | 'failed'
    error_message = Column(Text)  # 오류 메시지 (실패 시)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # 분석 결과 요약 (빠른 조회용)
    safety_score = Column(Integer)
    incident_count = Column(Integer)
    
    def __repr__(self):
        return f"<HourlyAnalysis(id={self.id}, camera={self.camera_id}, hour={self.hour_start}, status={self.status})>"


class SegmentAnalysis(Base):
    """5분 단위 상세 분석 결과"""
    __tablename__ = "segment_analyses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(50), nullable=False, index=True)
    segment_start = Column(DateTime, nullable=False, index=True)  # 5분 구간 시작
    segment_end = Column(DateTime, nullable=False)    # 5분 구간 종료
    video_path = Column(String(500))  # 분석한 비디오 파일 경로
    s3_url = Column(String(500))  # S3 URL (선택사항)
    analysis_result = Column(JSON)  # GeminiService.analyze_video_vlm()의 전체 결과
    status = Column(String(20), default='pending')  # 'pending' | 'processing' | 'completed' | 'failed'
    error_message = Column(Text)  # 오류 메시지 (실패 시)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # 분석 결과 요약 (빠른 조회용)
    safety_score = Column(Integer)
    incident_count = Column(Integer)
    
    def __repr__(self):
        return f"<SegmentAnalysis(id={self.id}, camera={self.camera_id}, segment={self.segment_start}, status={self.status})>"


class HourlyReport(Base):
    """1시간 단위 리포트 (텍스트 데이터 종합 분석 결과)"""
    __tablename__ = "hourly_reports"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(50), nullable=False, index=True)
    hour_start = Column(DateTime, nullable=False, index=True)  # 해당 시간대 시작 (예: 14:00)
    hour_end = Column(DateTime, nullable=False)  # 해당 시간대 종료 (예: 15:00)
    
    # 수치 데이터 (실시간 집계용)
    average_safety_score = Column(Float)  # 해당 시간대 평균 안전 점수
    total_incidents = Column(Integer)  # 해당 시간대 총 사건 수
    segment_count = Column(Integer)  # 분석된 세그먼트 수 (최대 6개)
    
    # 텍스트 데이터 (1시간마다 Gemini로 종합 분석)
    safety_summary = Column(Text)  # 안전 요약 (종합 분석 결과)
    safety_insights = Column(JSON)  # 안전 인사이트 리스트 (중복 제거, 그룹화됨)
    development_summary = Column(Text)  # 발달 요약 (종합 분석 결과)
    development_insights = Column(JSON)  # 발달 인사이트 리스트 (중복 제거, 그룹화됨)
    recommended_activities = Column(JSON)  # 추천 활동 리스트 (중복 제거, 그룹화됨)
    
    # 메타데이터
    segment_analyses_ids = Column(JSON)  # 해당 시간대의 segment_analyses ID 배열
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<HourlyReport(id={self.id}, camera={self.camera_id}, hour={self.hour_start})>"


class DailyReport(Base):
    """일일 리포트"""
    __tablename__ = "daily_reports"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(50), nullable=False, index=True)
    report_date = Column(DateTime, nullable=False, index=True)  # 리포트 날짜
    
    # 집계 데이터
    total_hours_analyzed = Column(Float)  # 분석된 시간 수
    average_safety_score = Column(Float)
    total_incidents = Column(Integer)
    
    # 상세 리포트 (JSON)
    safety_summary = Column(JSON)  # 안전 분석 집계
    development_summary = Column(JSON)  # 발달 분석 집계
    hourly_summary = Column(JSON)  # 시간대별 요약
    timeline_events = Column(JSON)  # 실시간 이벤트 타임라인
    
    # 메타데이터
    segment_analyses_ids = Column(JSON)  # 해당 일의 segment_analyses ID 배열
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<DailyReport(id={self.id}, camera={self.camera_id}, date={self.report_date})>"
