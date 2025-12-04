"""10분 단위 분석 스케줄러 (Job 등록만 수행)"""

import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

from app.models.live_monitoring.analysis_job import AnalysisJob, JobStatus
from app.database.session import get_db


class SegmentAnalysisScheduler:
    """
    10분 단위로 분석 Job을 등록하는 스케줄러
    
    실제 VLM 분석은 별도 워커 프로세스에서 수행
    이 스케줄러는 Job 등록만 수행하여 메인 이벤트 루프를 차단하지 않음
    """
    
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        # HLS 스트림의 archive 폴더에서 10분 단위 영상 가져오기
        self.buffer_dir = Path(f"temp_videos/hls_buffer/{camera_id}/archive")
        # fallback: hourly_buffer도 확인
        self.fallback_buffer_dir = Path(f"temp_videos/hourly_buffer/{camera_id}")
        self.is_running = False
        self.segment_duration_minutes = 10
        
    async def start_scheduler(self):
        """스케줄러 시작 (백그라운드 태스크)"""
        self.is_running = True
        print(f"[10분 분석 스케줄러] 시작: {self.camera_id}")
        
        while self.is_running:
            # 10분마다 실행 (예: 14:00, 14:10, 14:20...)
            # 30초 여유를 두어 10분 분량 비디오가 완전히 저장되도록 함
            now = datetime.now()
            
            # 다음 10분 단위 시간 계산 (서버 시간 기준)
            current_minutes = now.minute
            next_minutes = ((current_minutes // 10) + 1) * 10
            
            if next_minutes >= 60:
                next_analysis_time = now.replace(hour=now.hour+1 if now.hour < 23 else 0, minute=0, second=30, microsecond=0)
                if now.hour == 23:
                    next_analysis_time += timedelta(days=1)
            else:
                next_analysis_time = now.replace(minute=next_minutes, second=30, microsecond=0)
            
            # 이미 지난 시간이면 다음 10분으로
            if next_analysis_time <= now:
                next_analysis_time += timedelta(minutes=10)
            
            wait_seconds = (next_analysis_time - now).total_seconds()

            # 로그는 한국 시간(KST, UTC+9) 기준으로 출력
            kst_offset = timedelta(hours=9)
            next_analysis_time_kst = next_analysis_time + kst_offset
            
            if wait_seconds > 0:
                print(f"[10분 분석 스케줄러] 다음 분석 시간(한국 시각): {next_analysis_time_kst.strftime('%H:%M:%S')} ({wait_seconds:.0f}초 후)")
                await asyncio.sleep(wait_seconds)
            
            if self.is_running:
                # Job 등록 (비동기, 빠르게 완료)
                await self._register_analysis_job()
        
        print(f"[10분 분석 스케줄러] 종료: {self.camera_id}")
    
    async def _register_analysis_job(self):
        """
        분석 Job을 DB에 등록 (빠르게 완료, 메인 루프 차단 없음)
        
        전략: 현재 시간에서 10분 전 구간을 분석 대상으로 등록
        - 예: 11:30에 실행 → 11:10~11:20 구간 분석 Job 등록
        - 이유: 11:20~11:30 구간은 아직 생성 중이거나 막 완료되어 불안정
        """
        
        db = next(get_db())
        
        try:
            # 1. 분석할 구간 정의 (현재 시간 기준 10분 전 구간)
            now = datetime.now()
            
            # 현재 시간을 10분 단위로 내림 (서버 시간 기준)
            current_minutes = (now.minute // 10) * 10
            current_segment_end = now.replace(minute=current_minutes, second=0, microsecond=0)
            
            # 10분 전 구간을 분석 대상으로 설정
            segment_end = current_segment_end - timedelta(minutes=10)
            segment_start = segment_end - timedelta(minutes=10)

            # 로그는 한국 시간(KST, UTC+9) 기준으로 출력 (실제 계산은 서버 시간 기준)
            kst_offset = timedelta(hours=9)
            now_kst = now + kst_offset
            segment_start_kst = segment_start + kst_offset
            segment_end_kst = segment_end + kst_offset
            
            print(f"[Job 등록] 📅 현재 시간(한국 시각): {now_kst.strftime('%H:%M:%S')}")
            print(f"[Job 등록] 🎯 분석 대상 구간(한국 시각): {segment_start_kst.strftime('%H:%M:%S')} ~ {segment_end_kst.strftime('%H:%M:%S')}")
            
            # 2. 해당 구간의 비디오 파일 찾기
            video_path = self._get_segment_video(segment_start)
            
            if not video_path or not video_path.exists():
                print(f"[Job 등록] ❌ 비디오 파일 없음: {segment_start.strftime('%H:%M:%S')}")
                return
            
            # 3. 이미 등록된 Job이 있는지 확인
            existing_job = db.query(AnalysisJob).filter(
                AnalysisJob.camera_id == self.camera_id,
                AnalysisJob.segment_start == segment_start,
                AnalysisJob.status.in_([JobStatus.PENDING, JobStatus.PROCESSING, JobStatus.COMPLETED])
            ).first()
            
            if existing_job:
                print(f"[Job 등록] ⏭️ 이미 등록됨 (상태: {existing_job.status}): {segment_start.strftime('%H:%M:%S')}")
                return
            
            # 4. 분석 Job 등록 (빠르게 완료)
            analysis_job = AnalysisJob(
                camera_id=self.camera_id,
                video_path=str(video_path),
                segment_start=segment_start,
                segment_end=segment_end,
                status=JobStatus.PENDING
            )
            db.add(analysis_job)
            db.commit()
            
            print(f"[Job 등록] ✅ Job 등록 완료 (ID: {analysis_job.id}): {video_path.name}")
            print(f"[Job 등록] 워커 프로세스가 이 Job을 처리할 예정입니다.")
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[Job 등록] 오류: {e}")
            print(error_trace)
        finally:
            db.close()
    
    def _get_segment_video(self, segment_start: datetime) -> Optional[Path]:
        """해당 구간의 비디오 파일 경로 반환"""
        # HLS archive 폴더에서 찾기 (archive_YYYYMMDD_HHMMSS.mp4)
        archive_filename = f"archive_{segment_start.strftime('%Y%m%d_%H%M%S')}.mp4"
        archive_path = self.buffer_dir / archive_filename
        
        if archive_path.exists():
            print(f"[10분 분석 스케줄러] ✅ 정확한 아카이브 파일 발견: {archive_filename}")
            return archive_path
        
        # 패턴 검색 1: 같은 날짜, 같은 시간, 같은 분 (초만 다를 수 있음)
        archive_pattern = f"archive_{segment_start.strftime('%Y%m%d_%H%M')}*.mp4"
        matching_archives = list(self.buffer_dir.glob(archive_pattern))
        
        if matching_archives:
            # 가장 최근에 생성된 파일 선택
            latest_archive = max(matching_archives, key=lambda f: f.stat().st_mtime)
            print(f"[10분 분석 스케줄러] ✅ 패턴 매칭 아카이브 발견: {latest_archive.name}")
            return latest_archive
        
        # 패턴 검색 2: 시간대가 약간 다를 수 있으므로 ±10분 범위에서 검색
        for offset_minutes in range(-10, 11):
            adjusted_time = segment_start + timedelta(minutes=offset_minutes)
            adjusted_pattern = f"archive_{adjusted_time.strftime('%Y%m%d_%H%M')}*.mp4"
            adjusted_matches = list(self.buffer_dir.glob(adjusted_pattern))
            
            if adjusted_matches:
                # 파일 생성 시간이 segment_start와 가장 가까운 파일 선택
                closest_file = min(
                    adjusted_matches,
                    key=lambda f: abs((datetime.fromtimestamp(f.stat().st_mtime) - segment_start).total_seconds())
                )
                print(f"[10분 분석 스케줄러] ✅ 시간 범위 검색으로 아카이브 발견: {closest_file.name} (offset: {offset_minutes}분)")
                return closest_file
        
        # fallback: hourly_buffer에서 segment 파일 찾기
        segment_filename = f"segment_{segment_start.strftime('%Y%m%d_%H%M%S')}.mp4"
        fallback_path = self.fallback_buffer_dir / segment_filename
        
        if fallback_path.exists():
            print(f"[10분 분석 스케줄러] ✅ Fallback 세그먼트 파일 발견: {segment_filename}")
            return fallback_path
        
        # fallback 패턴 검색
        segment_pattern = f"segment_{segment_start.strftime('%Y%m%d_%H%M')}*.mp4"
        matching_segments = list(self.fallback_buffer_dir.glob(segment_pattern))
        
        if matching_segments:
            latest_segment = max(matching_segments, key=lambda f: f.stat().st_mtime)
            print(f"[10분 분석 스케줄러] ✅ Fallback 패턴 매칭 발견: {latest_segment.name}")
            return latest_segment
        
        # 디버그: 디렉토리 내용 출력
        print(f"[10분 분석 스케줄러] ❌ 파일을 찾을 수 없음:")
        print(f"  - 찾는 시간: {segment_start.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  - Archive 디렉토리: {self.buffer_dir}")
        print(f"  - Archive 존재 여부: {self.buffer_dir.exists()}")
        if self.buffer_dir.exists():
            files = sorted(list(self.buffer_dir.glob("*.mp4")), key=lambda f: f.stat().st_mtime, reverse=True)
            print(f"  - Archive 파일 목록 ({len(files)}개, 최근 5개): {[f.name for f in files[:5]]}")
        print(f"  - Fallback 디렉토리: {self.fallback_buffer_dir}")
        print(f"  - Fallback 존재 여부: {self.fallback_buffer_dir.exists()}")
        if self.fallback_buffer_dir.exists():
            files = sorted(list(self.fallback_buffer_dir.glob("*.mp4")), key=lambda f: f.stat().st_mtime, reverse=True)
            print(f"  - Fallback 파일 목록 ({len(files)}개, 최근 5개): {[f.name for f in files[:5]]}")
        
        return None
    
    def stop_scheduler(self):
        """스케줄러 중지"""
        print(f"[10분 분석 스케줄러] 중지 요청: {self.camera_id}")
        self.is_running = False


# 전역 스케줄러 관리
active_segment_schedulers = {}


async def start_segment_analysis_for_camera(camera_id: str):
    """특정 카메라의 10분 분석 스케줄러 시작"""
    if camera_id in active_segment_schedulers:
        print(f"[10분 분석 스케줄러] 이미 실행 중: {camera_id}")
        return
    
    scheduler = SegmentAnalysisScheduler(camera_id)
    active_segment_schedulers[camera_id] = scheduler
    
    # 백그라운드 태스크로 실행
    asyncio.create_task(scheduler.start_scheduler())
    
    print(f"[10분 분석 스케줄러] 시작됨: {camera_id}")


async def stop_segment_analysis_for_camera(camera_id: str):
    """특정 카메라의 10분 분석 스케줄러 중지"""
    if camera_id not in active_segment_schedulers:
        print(f"[10분 분석 스케줄러] 실행 중이 아님: {camera_id}")
        return
    
    scheduler = active_segment_schedulers[camera_id]
    scheduler.stop_scheduler()
    del active_segment_schedulers[camera_id]
    
    print(f"[10분 분석 스케줄러] 중지됨: {camera_id}")

