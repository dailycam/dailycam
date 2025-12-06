"""
VLM 분석 워커 프로세스

메인 FastAPI 서버와 완전히 분리된 별도 프로세스로 실행
analysis_jobs 테이블을 폴링하여 PENDING 상태의 Job을 처리
"""

import asyncio
import time
import signal
import signal
import sys
import os
from pathlib import Path
from datetime import datetime
from sqlalchemy import and_

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import get_db
from app.models.live_monitoring.analysis_job import AnalysisJob, JobStatus
from app.models.live_monitoring.models import SegmentAnalysis
from app.services.gemini_service import GeminiService


class AnalysisWorker:
    """VLM 분석 워커"""
    
    def __init__(self, worker_id: str = "worker-1"):
        self.worker_id = worker_id
        self.gemini_service = GeminiService()
        self.is_running = False
        self.poll_interval = 5  # 5초마다 폴링
        
    def start(self):
        """워커 시작"""
        self.is_running = True
        print(f"[워커 {self.worker_id}] 🚀 시작됨")
        print(f"[워커 {self.worker_id}] 폴링 간격: {self.poll_interval}초")
        
        # Graceful shutdown 설정
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # 메인 루프
        asyncio.run(self._main_loop())
    
    def _signal_handler(self, signum, frame):
        """시그널 핸들러 (Ctrl+C 등)"""
        print(f"\n[워커 {self.worker_id}] 종료 신호 수신, 정리 중...")
        self.is_running = False
    
    async def _main_loop(self):
        """메인 폴링 루프"""
        while self.is_running:
            try:
                # PENDING 상태의 Job 하나 가져오기
                print(f"[워커 {self.worker_id}] 🔎 PENDING Job 검색 시작...")
                job = self._get_next_job()
                
                if job:
                    print(f"\n[워커 {self.worker_id}] 📋 Job 발견: ID={job.id}, 구간={job.segment_start.strftime('%H:%M:%S')}~{job.segment_end.strftime('%H:%M:%S')}")
                    await self._process_job(job)
                else:
                    # Job이 없으면 대기
                    await asyncio.sleep(self.poll_interval)
                    
            except Exception as e:
                print(f"[워커 {self.worker_id}] ❌ 메인 루프 오류: {e}")
                import traceback
                traceback.print_exc()
                await asyncio.sleep(self.poll_interval)
        
        print(f"[워커 {self.worker_id}] 종료됨")
    
    def _get_next_job(self) -> AnalysisJob:
        """다음 처리할 Job 가져오기"""
        db = next(get_db())
        try:
            # 현재 큐 상태 디버깅용 로그
            pending_count = db.query(AnalysisJob).filter(
                AnalysisJob.status == JobStatus.PENDING
            ).count()
            processing_count = db.query(AnalysisJob).filter(
                AnalysisJob.status == JobStatus.PROCESSING
            ).count()
            print(f"[워커 {self.worker_id}] 📊 큐 상태 - pending={pending_count}, processing={processing_count}")

            # PENDING 상태의 Job 중 가장 오래된 것 하나 가져오기
            job = db.query(AnalysisJob).filter(
                AnalysisJob.status == JobStatus.PENDING
            ).order_by(AnalysisJob.created_at.asc()).first()
            
            if job:
                # 상태를 PROCESSING으로 변경
                job.status = JobStatus.PROCESSING
                job.started_at = datetime.now()
                job.worker_id = self.worker_id
                db.commit()
                db.refresh(job)
                
            return job
        finally:
            db.close()
    
    async def _process_job(self, job: AnalysisJob):
        """Job 처리"""
        print(f"[워커 {self.worker_id}] 🚀 Job 처리 시작: ID={job.id}, 비디오={job.video_path}")
        db = next(get_db())
        
        try:
            video_path = Path(job.video_path)
            
            # 1. 파일 존재 확인
            if not video_path.exists():
                raise FileNotFoundError(f"비디오 파일 없음: {video_path}")
            
            # 2. 파일 안정화 대기 (30초 + 크기 확인)
            print(f"[워커 {self.worker_id}] ⏳ 파일 안정화 대기 중...")
            await asyncio.sleep(30)
            
            # 파일 크기 안정화 확인
            prev_size = 0
            stable_count = 0
            max_wait = 60
            
            for _ in range(max_wait):
                current_size = video_path.stat().st_size
                if current_size == prev_size and current_size > 0:
                    stable_count += 1
                    if stable_count >= 3:
                        print(f"[워커 {self.worker_id}] ✅ 파일 안정화 완료: {current_size / (1024 * 1024):.2f}MB")
                        break
                else:
                    stable_count = 0
                    prev_size = current_size
                await asyncio.sleep(1)
            
            # 3. 파일 크기 검증
            file_size = video_path.stat().st_size
            min_size_mb = 10
            
            if file_size < min_size_mb * 1024 * 1024:
                raise ValueError(f"비디오 파일이 너무 작음: {file_size / (1024 * 1024):.2f}MB (최소 {min_size_mb}MB 필요)")
            
            print(f"[워커 {self.worker_id}] 📹 비디오 파일 크기: {file_size / (1024 * 1024):.2f}MB ✅")
            
            # 4. Gemini VLM 분석 (재시도 로직 포함)
            max_retries = 3
            retry_delay = 5
            analysis_result = None
            
            for attempt in range(max_retries):
                try:
                    with open(video_path, 'rb') as f:
                        video_bytes = f.read()
                    
                    if attempt > 0:
                        print(f"[워커 {self.worker_id}] 🔄 Gemini VLM 분석 재시도 중... ({attempt + 1}/{max_retries})")
                    else:
                        print(f"[워커 {self.worker_id}] 🤖 Gemini VLM 분석 시작...")
                    
                    analysis_result = await self.gemini_service.analyze_video_vlm(
                        video_bytes=video_bytes,
                        content_type="video/mp4",
                        stage=None,
                        age_months=None
                    )
                    print(f"[워커 {self.worker_id}] ✅ Gemini VLM 분석 완료")
                    break
                    
                except Exception as e:
                    error_msg = str(e)
                    is_last_attempt = (attempt == max_retries - 1)
                    
                    if "500" in error_msg or "Internal" in error_msg:
                        if is_last_attempt:
                            raise Exception(f"Gemini VLM 분석 최종 실패 (500 에러, 재시도 {max_retries}회): {e}")
                        else:
                            print(f"[워커 {self.worker_id}] ⚠️ Gemini 500 에러, {retry_delay}초 후 재시도...")
                            await asyncio.sleep(retry_delay)
                            continue
                    else:
                        raise
            
            if analysis_result is None:
                raise Exception("Gemini VLM 분석 결과 없음")
            
            # 5. 결과 저장
            safety_analysis = analysis_result.get('safety_analysis', {})
            
            job.analysis_result = analysis_result
            job.safety_score = safety_analysis.get('safety_score', 100)
            job.incident_count = len(safety_analysis.get('incident_events', []))
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now()
            
            # SegmentAnalysis 테이블에도 저장 (기존 시스템 호환성)
            development_analysis = analysis_result.get('development_analysis', {})
            
            segment_analysis = SegmentAnalysis(
                camera_id=job.camera_id,
                segment_start=job.segment_start,
                segment_end=job.segment_end,
                video_path=job.video_path,
                analysis_result=analysis_result,
                status='completed',
                completed_at=datetime.now(),
                safety_score=job.safety_score,
                incident_count=job.incident_count,
                # 발달 점수 추가
                development_score=development_analysis.get('development_score', 0),
                development_radar_scores=development_analysis.get('development_radar_scores', {}),
                # 클립 생성용 데이터
                safety_incidents=safety_analysis.get('incident_events', []),
                development_milestones=development_analysis.get('skills', [])
            )
            db.add(segment_analysis)
            db.commit()
            db.refresh(segment_analysis)
            
            print(f"[워커 {self.worker_id}] ✅ Job 완료: ID={job.id}")
            print(f"  📊 안전 점수: {job.safety_score}")
            print(f"  🚨 사건 수: {job.incident_count}")
            print(f"  🎯 발달 점수: {segment_analysis.development_score}")

            
            # 6. 파일 삭제 (옵션)
            delete_after = os.getenv("DELETE_VIDEO_AFTER_ANALYSIS", "True").lower() == "true"
            if delete_after and video_path.exists():
                try:
                    os.remove(video_path)
                    print(f"[워커 {self.worker_id}] 🗑️ 분석 완료된 파일 삭제함: {video_path.name}")
                except Exception as e:
                    print(f"[워커 {self.worker_id}] ⚠️ 파일 삭제 실패: {e}")
            elif not delete_after:
                print(f"[워커 {self.worker_id}] 📦 설정에 의해 파일 보존됨: {video_path.name}")
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[워커 {self.worker_id}] ❌ Job 실패: ID={job.id}, 오류: {e}")
            print(error_trace)
            
            # 재시도 가능 여부 확인
            job.retry_count += 1
            
            if job.retry_count < job.max_retries:
                # 재시도 가능 - PENDING으로 되돌림
                job.status = JobStatus.PENDING
                job.worker_id = None
                job.started_at = None
                print(f"[워커 {self.worker_id}] 🔄 Job 재시도 대기열로 복귀 (재시도 {job.retry_count}/{job.max_retries})")
            else:
                # 재시도 횟수 초과 - FAILED로 표시
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                job.completed_at = datetime.now()
                job.completed_at = datetime.now()
                print(f"[워커 {self.worker_id}] ❌ Job 최종 실패 (재시도 {job.max_retries}회 초과)")
                
                # 최종 실패 시에도 파일 삭제 (불필요한 용량 차지 방지)
                delete_after = os.getenv("DELETE_VIDEO_AFTER_ANALYSIS", "True").lower() == "true"
                if delete_after and video_path.exists():
                    try:
                        os.remove(video_path)
                        print(f"[워커 {self.worker_id}] 🗑️ 실패한 파일 삭제함: {video_path.name}")
                    except Exception as de:
                        print(f"[워커 {self.worker_id}] ⚠️ 파일 삭제 실패: {de}")
            
            db.commit()
        finally:
            db.close()


if __name__ == "__main__":
    import os
    
    # 워커 ID (환경 변수나 인자로 받을 수 있음)
    worker_id = os.getenv("WORKER_ID", "worker-1")
    
    print("=" * 60)
    print("🤖 VLM 분석 워커 프로세스")
    print("=" * 60)
    print(f"워커 ID: {worker_id}")
    print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    worker = AnalysisWorker(worker_id=worker_id)
    worker.start()

