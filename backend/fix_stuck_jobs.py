"""PROCESSING 상태로 멈춘 Job들을 PENDING으로 되돌리는 스크립트"""

import sys
from pathlib import Path
from datetime import datetime, timedelta

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import get_db
from app.models.live_monitoring.analysis_job import AnalysisJob, JobStatus

def fix_stuck_jobs():
    """30분 이상 PROCESSING 상태인 Job들을 PENDING으로 되돌림"""
    db = next(get_db())
    
    try:
        # 30분 전 시간
        threshold = datetime.now() - timedelta(minutes=30)
        
        # PROCESSING 상태이면서 30분 이상 지난 Job들 찾기
        stuck_jobs = db.query(AnalysisJob).filter(
            AnalysisJob.status == JobStatus.PROCESSING.value,
            AnalysisJob.started_at < threshold
        ).all()
        
        print(f"🔍 멈춘 Job 개수: {len(stuck_jobs)}")
        
        for job in stuck_jobs:
            print(f"  - Job ID={job.id}, 시작 시간={job.started_at}, 워커={job.worker_id}")
            
            # PENDING으로 되돌림
            job.status = JobStatus.PENDING.value
            job.started_at = None
            job.worker_id = None
            job.retry_count += 1
            
            print(f"    ✅ PENDING으로 되돌림 (재시도 {job.retry_count}/{job.max_retries})")
        
        db.commit()
        print(f"\n✅ 총 {len(stuck_jobs)}개 Job 복구 완료")
        
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
    fix_stuck_jobs()
