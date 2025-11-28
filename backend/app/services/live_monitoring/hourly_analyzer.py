"""1시간 단위 분석 스케줄러"""

import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

from app.services.gemini_service import GeminiService
from app.models.live_monitoring.models import HourlyAnalysis
from app.database.session import get_db


class HourlyAnalysisScheduler:
    """
    1시간 단위로 비디오를 분석하는 스케줄러
    """
    
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.gemini_service = GeminiService()
        self.buffer_dir = Path(f"temp_videos/hourly_buffer/{camera_id}")
        self.is_running = False
        
    async def start_scheduler(self):
        """스케줄러 시작 (백그라운드 태스크)"""
        self.is_running = True
        print(f"[분석 스케줄러] 시작: {self.camera_id}")
        
        while self.is_running:
            # 매 시간 정각 + 5분에 실행 (예: 14:05, 15:05, 16:05...)
            # 5분 여유를 두어 1시간 분량 비디오가 완전히 저장되도록 함
            now = datetime.now()
            next_analysis_time = (now.replace(minute=5, second=0, microsecond=0) + 
                                 timedelta(hours=1))
            
            if now.minute >= 5:
                # 이미 5분이 지났으면 다음 시간으로
                pass
            else:
                # 아직 5분 전이면 이번 시간으로
                next_analysis_time = now.replace(minute=5, second=0, microsecond=0)
            
            wait_seconds = (next_analysis_time - now).total_seconds()
            
            if wait_seconds > 0:
                print(f"[분석 스케줄러] 다음 분석 시간: {next_analysis_time} ({wait_seconds/60:.1f}분 후)")
                await asyncio.sleep(wait_seconds)
            
            if self.is_running:
                await self._analyze_previous_hour()
        
        print(f"[분석 스케줄러] 종료: {self.camera_id}")
    
    async def _analyze_previous_hour(self):
        """
        이전 1시간 분량의 비디오를 분석
        """
        db = next(get_db())
        
        try:
            # 1. 이전 시간대 정의 (예: 현재가 15:05이면 14:00-15:00)
            now = datetime.now()
            hour_start = (now.replace(minute=0, second=0, microsecond=0) - 
                         timedelta(hours=1))
            hour_end = hour_start + timedelta(hours=1)
            
            print(f"[분석 스케줄러] 분석 시작: {hour_start} ~ {hour_end}")
            
            # 2. 해당 시간대의 비디오 파일 찾기
            video_path = self._get_hourly_video(hour_start)
            if not video_path or not video_path.exists():
                print(f"[분석 스케줄러] 비디오 파일 없음: {hour_start}")
                return
            
            # 3. 이미 분석된 시간대인지 확인
            existing = db.query(HourlyAnalysis).filter(
                HourlyAnalysis.camera_id == self.camera_id,
                HourlyAnalysis.hour_start == hour_start,
                HourlyAnalysis.status == 'completed'
            ).first()
            
            if existing:
                print(f"[분석 스케줄러] 이미 분석 완료: {hour_start}")
                return
            
            # 4. DB에 분석 작업 등록
            hourly_analysis = HourlyAnalysis(
                camera_id=self.camera_id,
                hour_start=hour_start,
                hour_end=hour_end,
                video_path=str(video_path),
                status='processing'
            )
            db.add(hourly_analysis)
            db.commit()
            db.refresh(hourly_analysis)
            
            print(f"[분석 스케줄러] 분석 중: {video_path.name}")
            
            # 5. Gemini로 상세 분석
            with open(video_path, 'rb') as f:
                video_bytes = f.read()
            
            analysis_result = await self.gemini_service.analyze_video_vlm(
                video_bytes=video_bytes,
                content_type="video/mp4",
                stage=None,  # 자동 판단
                age_months=None  # 설정에서 가져오기 (추후 구현)
            )
            
            # 6. 결과 저장
            safety_analysis = analysis_result.get('safety_analysis', {})
            
            hourly_analysis.analysis_result = analysis_result
            hourly_analysis.status = 'completed'
            hourly_analysis.completed_at = datetime.now()
            hourly_analysis.safety_score = safety_analysis.get('safety_score', 100)
            hourly_analysis.incident_count = len(safety_analysis.get('incident_events', []))
            
            db.commit()
            
            print(f"[분석 스케줄러] 분석 완료: {hour_start} ~ {hour_end}")
            print(f"  안전 점수: {hourly_analysis.safety_score}")
            print(f"  사건 수: {hourly_analysis.incident_count}")
            
            # 7. 분석 완료 후 비디오 파일 삭제 (선택사항)
            # video_path.unlink()
            # print(f"[분석 스케줄러] 비디오 파일 삭제: {video_path.name}")
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[분석 스케줄러] 오류: {e}")
            print(error_trace)
            
            if 'hourly_analysis' in locals():
                hourly_analysis.status = 'failed'
                hourly_analysis.error_message = str(e)
                hourly_analysis.completed_at = datetime.now()
                db.commit()
        finally:
            db.close()
    
    def _get_hourly_video(self, hour_start: datetime) -> Optional[Path]:
        """해당 시간대의 비디오 파일 경로 반환"""
        filename = f"hourly_{hour_start.strftime('%Y%m%d_%H%M%S')}.mp4"
        video_path = self.buffer_dir / filename
        
        if video_path.exists():
            return video_path
        
        # 파일명이 정확히 일치하지 않을 수 있으므로 패턴 검색
        pattern = f"hourly_{hour_start.strftime('%Y%m%d_%H')}*.mp4"
        matching_files = list(self.buffer_dir.glob(pattern))
        
        if matching_files:
            return matching_files[0]
        
        return None
    
    def stop_scheduler(self):
        """스케줄러 중지"""
        print(f"[분석 스케줄러] 중지 요청: {self.camera_id}")
        self.is_running = False


# 전역 스케줄러 관리
active_schedulers = {}


async def start_hourly_analysis_for_camera(camera_id: str):
    """특정 카메라의 1시간 분석 스케줄러 시작"""
    if camera_id in active_schedulers:
        print(f"[분석 스케줄러] 이미 실행 중: {camera_id}")
        return
    
    scheduler = HourlyAnalysisScheduler(camera_id)
    active_schedulers[camera_id] = scheduler
    
    # 백그라운드 태스크로 실행
    asyncio.create_task(scheduler.start_scheduler())
    
    print(f"[분석 스케줄러] 시작됨: {camera_id}")


def stop_hourly_analysis_for_camera(camera_id: str):
    """특정 카메라의 1시간 분석 스케줄러 중지"""
    if camera_id not in active_schedulers:
        print(f"[분석 스케줄러] 실행 중이 아님: {camera_id}")
        return
    
    scheduler = active_schedulers[camera_id]
    scheduler.stop_scheduler()
    del active_schedulers[camera_id]
    
    print(f"[분석 스케줄러] 중지됨: {camera_id}")

