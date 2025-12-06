"""PROCESSING 상태로 멈춘 Job들을 FAILED로 처리하는 스크립트"""

import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.database.session import get_db
from app.models.live_monitoring.analysis_job import AnalysisJob, JobStatus

def clear_stuck_jobs():
    """PROCESSING 상태인 모든 Job들을 FAILED로 처리"""
    db = next(get_db())
    
    try:
        # PROCESSING 상태인 모든 Job들 찾기
        stuck_jobs = db.query(AnalysisJob).filter(
            AnalysisJob.status == JobStatus.PROCESSING.value
        ).all()
        
        print(f"🔍 PROCESSING 상태 Job 개수: {len(stuck_jobs)}")
        
        for job in stuck_jobs:
            print(f"  - Job ID={job.id}, 시작 시간={job.started_at}, 워커={job.worker_id}")
            
            # FAILED로 처리
            job.status = JobStatus.FAILED.value
            job.error_message = "재시작으로 인한 강제 종료"
            
            print(f"    ✅ FAILED로 처리")
        
        db.commit()
        print(f"\n✅ 총 {len(stuck_jobs)}개 Job 정리 완료")
        
        # 현재 큐 상태 출력
        pending_count = db.query(AnalysisJob).filter(
            AnalysisJob.status == JobStatus.PENDING.value
        ).count()
        processing_count = db.query(AnalysisJob).filter(
            AnalysisJob.status == JobStatus.PROCESSING.value
        ).count()
        completed_count = db.query(AnalysisJob).filter(
            AnalysisJob.status == JobStatus.COMPLETED.value
        ).count()
        failed_count = db.query(AnalysisJob).filter(
            AnalysisJob.status == JobStatus.FAILED.value
        ).count()
        
        print(f"\n📊 현재 큐 상태:")
        print(f"  - PENDING: {pending_count}")
        print(f"  - PROCESSING: {processing_count}")
        print(f"  - COMPLETED: {completed_count}")
        print(f"  - FAILED: {failed_count}")
        
    finally:
        db.close()

if __name__ == "__main__":
    clear_stuck_jobs()
