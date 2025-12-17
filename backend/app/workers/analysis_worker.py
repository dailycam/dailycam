"""
VLM 분석 워커 프로세스

메인 FastAPI 서버와 완전히 분리된 별도 프로세스로 실행
analysis_jobs 테이블을 폴링하여 PENDING 상태의 Job을 처리
"""

import asyncio
import time
import signal
import sys
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
from sqlalchemy import and_

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.database.session import get_db
from app.models.live_monitoring.analysis_job import AnalysisJob, JobStatus
from app.models.live_monitoring.models import SegmentAnalysis
from app.models.analysis import AnalysisLog, DevelopmentEvent, DevelopmentCategory
from app.models.user import User
from app.services.gemini_service import GeminiService
from app.services.analysis_service import AnalysisService
from dateutil.relativedelta import relativedelta


class AnalysisWorker:
    """VLM 분석 워커"""
    
    def __init__(self, worker_id: str = "worker-1"):
        self.worker_id = worker_id
        self.gemini_service = GeminiService()
        self.is_running = False
        self.poll_interval = 20  # 20초마다 폴링
        
    def start(self):
        """워커 시작"""
        self.is_running = True
        
        # Graceful shutdown 설정
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # 메인 루프 전, 비정상 종료된 Job 복구
        self._recover_stuck_jobs()

        # 메인 루프
        asyncio.run(self._main_loop())

    
    def _signal_handler(self, signum, frame):
        """시그널 핸들러 (Ctrl+C 등)"""
        self.is_running = False
    
    async def _main_loop(self):
        """메인 폴링 루프"""
        while self.is_running:
            try:
                # PENDING 상태의 Job 하나 가져오기
                job = self._get_next_job()
                
                if job:
                    # UTC -> KST 변환하여 로그 출력
                    from datetime import timezone
                    import pytz
                    kst = pytz.timezone('Asia/Seoul')
                    
                    # job.segment_start/end는 naive datetime (UTC)
                    start_utc = job.segment_start.replace(tzinfo=timezone.utc)
                    end_utc = job.segment_end.replace(tzinfo=timezone.utc)
                    start_kst = start_utc.astimezone(kst)
                    end_kst = end_utc.astimezone(kst)
                    
                    await self._process_job(job)
                else:
                    # Job이 없으면 대기
                    await asyncio.sleep(self.poll_interval)
                    
            except Exception:
                await asyncio.sleep(self.poll_interval)
    
    def _get_next_job(self) -> AnalysisJob:
        """다음 처리할 Job 가져오기"""
        db = next(get_db())
        try:

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
        db = next(get_db())
        
        # camera_id로 user_id 조회 (먼저 조회해야 나이 계산 등에 사용 가능)
        user_id = self._get_user_id_from_camera(job.camera_id, db)
        
        try:
            # 경로 처리: 상대 경로면 프로젝트 루트 기준으로 변환, 절대 경로면 그대로 사용
            backend_dir = Path(__file__).parent.parent.parent
            video_path = Path(job.video_path)
            
            # 파일명 추출 (나중에 재시도에 사용)
            filename = video_path.name
            
            if not video_path.is_absolute():
                # 상대 경로인 경우: 프로젝트 루트 기준으로 절대 경로 생성
                video_path = (backend_dir / video_path).resolve()
            else:
                # 절대 경로인 경우: Docker 경로(/app)를 현재 환경에 맞게 변환
                # /app/temp_videos/... -> backend_dir/temp_videos/...
                if str(video_path).startswith('/app/'):
                    # Docker 경로를 상대 경로로 변환
                    relative_part = Path(*video_path.parts[2:])  # /app/temp_videos/... -> temp_videos/...
                    video_path = (backend_dir / relative_part).resolve()
            
            # 파일이 없으면 여러 경로 시도
            if not video_path.exists():
                # 파일명 기반으로 가능한 모든 경로 시도
                possible_paths = [
                    backend_dir / "temp_videos" / "hls_buffer" / job.camera_id / "archive" / filename,
                    backend_dir / "temp_videos" / "hourly_buffer" / job.camera_id / filename,
                    backend_dir / "temp_videos" / job.camera_id / "archive" / filename,
                ]
                
                # 아카이브 디렉토리 전체 스캔 (파일명으로 검색)
                archive_dirs = [
                    backend_dir / "temp_videos" / "hls_buffer" / job.camera_id / "archive",
                    backend_dir / "temp_videos" / "hourly_buffer" / job.camera_id,
                    backend_dir / "temp_videos" / job.camera_id / "archive",
                ]
                
                for archive_dir in archive_dirs:
                    if archive_dir.exists():
                        found_file = archive_dir / filename
                        if found_file.exists():
                            video_path = found_file
                            break
                
                # 여전히 없으면 possible_paths도 확인
                if not video_path.exists():
                    for possible_path in possible_paths:
                        if possible_path.exists():
                            video_path = possible_path
                            break
            
            # 1. S3 우선 확인, 없으면 로컬 파일 사용
            downloaded_from_s3 = False
            from app.services.s3_service import S3Service
            s3_service = S3Service()
            
            # S3 키 생성
            segment_start_utc = job.segment_start
            if segment_start_utc.tzinfo is None:
                segment_start_utc = segment_start_utc.replace(tzinfo=timezone.utc)
            
            # KST로 변환하여 파일명 생성
            kst = timezone(timedelta(hours=9))
            segment_start_kst = segment_start_utc.astimezone(kst)
            archive_filename = f"archive_{segment_start_kst.strftime('%Y%m%d_%H%M%S')}.mp4"
            s3_key = f"archives/{job.camera_id}/{segment_start_kst.strftime('%Y/%m/%d')}/{archive_filename}"
            
            # S3 우선 확인
            if s3_service.is_enabled() and s3_service.archive_exists(s3_key):
                # 로컬 디렉토리 생성
                video_path.parent.mkdir(parents=True, exist_ok=True)
                
                # S3에서 다운로드
                success = s3_service.download_archive(
                    s3_key=s3_key,
                    local_path=video_path
                )
                
                if success:
                    downloaded_from_s3 = True
                else:
                    # S3 다운로드 실패 시 로컬 파일 확인
                    if not video_path.exists():
                        raise FileNotFoundError(f"비디오 파일 없음 (S3 다운로드 실패, 로컬 파일도 없음): {video_path}")
            else:
                # S3에도 없고 로컬에도 없음
                # 마지막으로 파일명 기반 전체 검색 (성능 고려하여 제한적 검색)
                if not video_path.exists():
                    # temp_videos 전체에서 파일명으로 검색 (깊이 제한: 최대 3단계)
                    temp_videos_dir = backend_dir / "temp_videos"
                    if temp_videos_dir.exists():
                        try:
                            search_paths = [
                                temp_videos_dir / "hls_buffer" / "**" / filename,
                                temp_videos_dir / "hourly_buffer" / "**" / filename,
                                temp_videos_dir / "**" / filename,
                            ]
                            
                            for search_pattern in search_paths:
                                for found_file in temp_videos_dir.glob(str(search_pattern.relative_to(temp_videos_dir))):
                                    if found_file.exists() and found_file.name == filename:
                                        video_path = found_file
                                        break
                                if video_path.exists():
                                    break
                        except Exception:
                            pass
                
                if not video_path.exists():
                    if s3_service.is_enabled():
                        raise FileNotFoundError(f"비디오 파일 없음 (S3에도 로컬에도 없음): {s3_key}, 원본 경로: {job.video_path}")
                    else:
                        raise FileNotFoundError(f"비디오 파일 없음 (S3 비활성화, 로컬 파일도 없음): {video_path}, 원본 경로: {job.video_path}, 파일명: {filename}")
            
            # 2. 파일 안정화 대기 (S3에서 다운로드한 경우는 스킵)
            if not downloaded_from_s3:
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
                            break
                    else:
                        stable_count = 0
                        prev_size = current_size
                    await asyncio.sleep(1)
            
            # 3. 파일 크기 검증
            file_size = video_path.stat().st_size
            min_size_mb = 0.01  # 1MB -> 0.01MB (10KB)로 완화 (최적화 영상 대응)
            
            if file_size < min_size_mb * 1024 * 1024:
                raise ValueError(f"비디오 파일이 너무 작음: {file_size / (1024 * 1024):.2f}MB (최소 {min_size_mb}MB 필요)")
            
            # 4. Gemini VLM 분석 (재시도 로직 포함)
            max_retries = 3
            retry_delay = 5
            analysis_result = None
            
            for attempt in range(max_retries):
                try:
                    # 파일 읽기(bytes loading) 제거 - GeminiService가 직접 파일 경로를 처리함
                    
                    
                    # 아이 개월 수 계산
                    user = db.query(User).filter(User.id == user_id).first()
                    age_months = None
                    if user and user.child_birthdate:
                        try:
                            today = datetime.now().date()
                            # date 타입 호환성 처리
                            birthdate = user.child_birthdate
                            if isinstance(birthdate, datetime):
                                birthdate = birthdate.date()
                                
                            delta = relativedelta(today, birthdate)
                            age_months = delta.years * 12 + delta.months
                        except Exception as e:
                            pass

                    # VLM 분석 호출 (파일 경로 전달)
                    analysis_result = await self.gemini_service.analyze_video_vlm(
                        video_path=str(video_path),
                        content_type="video/mp4",
                        stage=None,
                        age_months=age_months
                    )
                    break
                    
                except Exception as e:
                    error_msg = str(e)
                    is_last_attempt = (attempt == max_retries - 1)
                    
                    if "500" in error_msg or "Internal" in error_msg:
                        if is_last_attempt:
                            raise Exception(f"Gemini VLM 분석 최종 실패 (500 에러): {e}")
                        else:
                            await asyncio.sleep(retry_delay)
                            continue
                    else:
                        raise
            
            if analysis_result is None:
                raise Exception("Gemini VLM 분석 결과 없음")
            
            # 5. 결과 저장
            safety_analysis = analysis_result.get('safety_analysis', {})
            development_analysis = analysis_result.get('development_analysis', {})
            
            job.analysis_result = analysis_result
            job.safety_score = safety_analysis.get('safety_score', 100)
            job.incident_count = len(safety_analysis.get('incident_events', []))
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now()
            
            # SegmentAnalysis 테이블에도 저장 (기존 시스템 호환성)
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
                # 클립 생성용 데이터 (safety_events는 UI 표시용 title/description 포함)
                safety_incidents=safety_analysis.get('safety_events', []),  # UI용 safety_events 사용
                development_milestones=development_analysis.get('skills', [])
            )
            db.add(segment_analysis)
            db.flush()  # segment_analysis.id를 얻기 위해 flush
            
            # DevelopmentEvent 생성을 위한 AnalysisLog 생성
            # camera_id로 user_id 매핑 (상단에서 이미 조회함)
            # user_id = self._get_user_id_from_camera(job.camera_id, db)
            
            # AnalysisService를 사용하여 AnalysisLog 및 관련 데이터(SafetyEvent, DevelopmentEvent, HighlightClip 등) 일괄 저장
            # SegmentAnalysis의 ID를 AnalysisLog의 analysis_id로 사용하여 연결
            # 이를 통해 대시보드, 리포트, 홈 화면에 데이터가 올바르게 표시됨
            AnalysisService.save_analysis_result(
                db=db,
                user_id=user_id,
                video_path=job.video_path,
                analysis_result=analysis_result,
                analysis_id=segment_analysis.id
            )
            
            # 6. RealtimeEvent 생성 (모니터링 통계용)
            # 10분 단위 분석 결과를 RealtimeEvent로 변환하여 모니터링 페이지 통계에 반영
            # (실시간성은 떨어지지만 통계 데이터 정합성을 위해 필요 - OpenCV 실시간 감지 제거됨)
            from app.models.live_monitoring.models import RealtimeEvent
            
            safety_events = safety_analysis.get('safety_events', [])
            for event_data in safety_events:
                # Severity 매핑
                severity_str = event_data.get("severity", "info")
                severity_map = {
                    "사고": "danger", 
                    "위험": "danger",
                    "주의": "warning",
                    "권장": "info",
                    "안전": "safe"
                }
                severity = severity_map.get(severity_str, "info")
                
                # Timestamp 계산 (세그먼트 시작 시간 + 오프셋)
                event_ts = job.segment_start
                ts_range = event_data.get("timestamp_range")
                if ts_range and isinstance(ts_range, list) and len(ts_range) > 0:
                    try:
                        # "00:10" or 10 (seconds)
                        start_offset = ts_range[0]
                        if isinstance(start_offset, str) and ":" in start_offset:
                            parts = start_offset.split(":")
                            seconds = int(parts[0]) * 60 + float(parts[1])
                            event_ts += timedelta(seconds=seconds)
                        elif isinstance(start_offset, (int, float)):
                            event_ts += timedelta(seconds=start_offset)
                    except:
                        pass
                
                realtime_event = RealtimeEvent(
                    camera_id=job.camera_id,
                    timestamp=event_ts,
                    event_type="safety",
                    severity=severity,
                    title=event_data.get("title", "알 수 없는 이벤트"),
                    description=event_data.get("description", ""),
                    location=event_data.get("location", ""),
                    event_metadata=event_data
                )
                db.add(realtime_event)
            
            db.commit()
            
            # 7. 하이라이트 클립 자동 생성
            try:
                from app.services.highlight_clip_service import HighlightClipService
                
                clip_service = HighlightClipService(camera_id=job.camera_id)
                clip_service.create_clips_from_segment_analysis(
                    segment_analysis=segment_analysis,
                    db=db
                )
            except Exception:
                pass  # 클립 생성 실패해도 분석은 성공으로 처리
            
            # 8. S3 아카이브 삭제 (분석 완료 후 즉시 삭제 - 비용 절감)
            # 주의: 원본 영상을 보관하려면 이 로직을 비활성화하고 S3 Lifecycle 정책 사용 권장
            # from app.services.s3_service import S3Service
            # s3_service = S3Service()
            # if s3_service.is_enabled():
            #     # segment_start를 사용하여 S3 키 생성
            #     segment_start_utc = segment_analysis.segment_start
            #     if segment_start_utc.tzinfo is None:
            #         segment_start_utc = segment_start_utc.replace(tzinfo=timezone.utc)
            #     
            #     # delete_success = s3_service.delete_archive(
            #     #     camera_id=job.camera_id,
            #     #     segment_start=segment_start_utc
            #     # )
            #     pass
            
            # 9. 파일 삭제 (옵션)
            delete_after = os.getenv("DELETE_VIDEO_AFTER_ANALYSIS", "True").lower() == "true"
            if delete_after and video_path.exists():
                try:
                    os.remove(video_path)
                except Exception as e:
                    pass
            
        except Exception as e:
            # 재시도 가능 여부 확인
            job.retry_count += 1
            
            if job.retry_count < job.max_retries:
                # 재시도 가능 - PENDING으로 되돌림
                job.status = JobStatus.PENDING
                job.worker_id = None
                job.started_at = None
            else:
                # 재시도 횟수 초과 - FAILED로 표시
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                job.completed_at = datetime.now()
                
                # 최종 실패 시에도 파일 삭제 (불필요한 용량 차지 방지)
                delete_after = os.getenv("DELETE_VIDEO_AFTER_ANALYSIS", "True").lower() == "true"
                if delete_after and Path(job.video_path).exists():
                    try:
                        os.remove(job.video_path)
                    except Exception as de:
                        pass
            
            db.commit()
        finally:
            db.close()
    
    def _get_user_id_from_camera(self, camera_id: str, db) -> int:
        """camera_id로 user_id 찾기 (현재는 기본값 1, 추후 확장 가능)"""
        # TODO: camera_id와 user_id 매핑 테이블에서 조회
        # 현재는 기본값 1 사용
        return 1
    
    def _map_category_to_enum(self, category_str: str):
        """스키마의 category 문자열을 DevelopmentCategory Enum으로 매핑"""
        category_map = {
            "대근육운동": DevelopmentCategory.GROSS_MOTOR,
            "소근육운동": DevelopmentCategory.FINE_MOTOR,
            "언어": DevelopmentCategory.LANGUAGE,
            "인지": DevelopmentCategory.COGNITIVE,
            "사회정서": DevelopmentCategory.SOCIAL,
            # 하위 호환성
            "운동": DevelopmentCategory.MOTOR,  # 구분 불가능할 때
        }
        return category_map.get(category_str)

    def _recover_stuck_jobs(self):
        """비정상 종료로 PROCESSING 상태에 멈춰있는 Job 복구"""
        db = next(get_db())
        try:
            # 내 worker_id로 할당되어 있는데 처리 중인 Job들
            stuck_jobs = db.query(AnalysisJob).filter(
                AnalysisJob.status == JobStatus.PROCESSING,
                AnalysisJob.worker_id == self.worker_id
            ).all()
            
            if stuck_jobs:
                for job in stuck_jobs:
                    job.status = JobStatus.PENDING
                    job.worker_id = None
                    job.started_at = None
                db.commit()
                
        except Exception:
            pass
        finally:
            db.close()



if __name__ == "__main__":
    import os
    
    worker_id = os.getenv("WORKER_ID", "worker-1")
    worker = AnalysisWorker(worker_id=worker_id)
    worker.start()
