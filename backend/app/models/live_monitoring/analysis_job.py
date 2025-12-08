"""분석 작업 큐 모델"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.dialects.mysql import JSON
import enum

from app.database.base import Base


class JobStatus(str, enum.Enum):
    """작업 상태"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisJob(Base):
    """
    VLM 분석 작업 큐
    
    메인 프로세스는 Job만 등록하고,
    별도 워커 프로세스가 이 테이블을 폴링하여 분석 수행
    """
    __tablename__ = "analysis_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), nullable=False, index=True)
    
    # 분석 대상
    video_path = Column(String(500), nullable=False)
    segment_start = Column(DateTime, nullable=False, index=True)
    segment_end = Column(DateTime, nullable=False)
    
    # 작업 상태: DB ENUM('pending', ...)과 맞추기 위해 문자열로 저장
    # 애플리케이션 코드에서는 JobStatus Enum을 사용하되, value를 저장/비교에 사용
    status = Column(String(20), default=JobStatus.PENDING.value, nullable=False, index=True)
    
    # 결과 저장 (완료 시)
    analysis_result = Column(JSON, nullable=True)
    safety_score = Column(Integer, nullable=True)
    incident_count = Column(Integer, nullable=True)
    
    # 오류 정보 (실패 시)
    error_message = Column(Text, nullable=True)
    
    # 시간 정보
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    started_at = Column(DateTime, nullable=True)  # 처리 시작 시간
    completed_at = Column(DateTime, nullable=True)  # 완료 시간
    
    # 재시도 정보
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    
    # 워커 정보
    worker_id = Column(String(100), nullable=True)  # 어떤 워커가 처리 중인지
    
    def __repr__(self):
        return f"<AnalysisJob(id={self.id}, camera={self.camera_id}, status={self.status}, video={self.video_path})>"

