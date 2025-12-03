"""5분 단위 분석 스케줄러"""

import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

from app.services.gemini_service import GeminiService
from app.models.live_monitoring.models import SegmentAnalysis
from app.database.session import get_db


class SegmentAnalysisScheduler:
    """
    5분 단위로 비디오를 분석하는 스케줄러
    """
    
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.gemini_service = GeminiService()
        self.buffer_dir = Path(f"temp_videos/hourly_buffer/{camera_id}")
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
            
            # 다음 10분 단위 시간 계산
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
            
            if wait_seconds > 0:
                print(f"[10분 분석 스케줄러] 다음 분석 시간: {next_analysis_time.strftime('%H:%M:%S')} ({wait_seconds:.0f}초 후)")
                await asyncio.sleep(wait_seconds)
            
            if self.is_running:
                await self._analyze_previous_segment()
        
        print(f"[10분 분석 스케줄러] 종료: {self.camera_id}")
    
    async def _analyze_previous_segment(self):
        """
        이전 10분 분량의 비디오를 분석
        """
        db = next(get_db())
        
        try:
            # 1. 이전 10분 구간 정의
            now = datetime.now()
            
            # 현재 시간을 10분 단위로 내림
            current_minutes = (now.minute // 10) * 10
            segment_end = now.replace(minute=current_minutes, second=0, microsecond=0)
            segment_start = segment_end - timedelta(minutes=10)
            
            print(f"[10분 분석 스케줄러] 분석 시작: {segment_start.strftime('%H:%M:%S')} ~ {segment_end.strftime('%H:%M:%S')}")
            
            # 2. 해당 구간의 비디오 파일 찾기
            video_path = self._get_segment_video(segment_start)
            if not video_path or not video_path.exists():
                print(f"[10분 분석 스케줄러] 비디오 파일 없음: {segment_start.strftime('%H:%M:%S')}")
                return
            
            # 3. 이미 분석된 구간인지 확인
            existing = db.query(SegmentAnalysis).filter(
                SegmentAnalysis.camera_id == self.camera_id,
                SegmentAnalysis.segment_start == segment_start,
                SegmentAnalysis.status == 'completed'
            ).first()
            
            if existing:
                print(f"[10분 분석 스케줄러] 이미 분석 완료: {segment_start.strftime('%H:%M:%S')}")
                return
            
            # 4. DB에 분석 작업 등록
            segment_analysis = SegmentAnalysis(
                camera_id=self.camera_id,
                segment_start=segment_start,
                segment_end=segment_end,
                video_path=str(video_path),
                status='processing'
            )
            db.add(segment_analysis)
            db.commit()
            db.refresh(segment_analysis)
            
            print(f"[10분 분석 스케줄러] 분석 중: {video_path.name}")
            
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
            
            segment_analysis.analysis_result = analysis_result
            segment_analysis.status = 'completed'
            segment_analysis.completed_at = datetime.now()
            segment_analysis.safety_score = safety_analysis.get('safety_score', 100)
            segment_analysis.incident_count = len(safety_analysis.get('incident_events', []))
            
            db.commit()
            
            print(f"[10분 분석 스케줄러] 분석 완료: {segment_start.strftime('%H:%M:%S')} ~ {segment_end.strftime('%H:%M:%S')}")
            print(f"  안전 점수: {segment_analysis.safety_score}")
            print(f"  사건 수: {segment_analysis.incident_count}")
            
            # 7. 분석 완료 후 비디오 파일 삭제 (선택사항)
            # video_path.unlink()
            # print(f"[10분 분석 스케줄러] 비디오 파일 삭제: {video_path.name}")
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[10분 분석 스케줄러] 오류: {e}")
            print(error_trace)
            
            if 'segment_analysis' in locals():
                segment_analysis.status = 'failed'
                segment_analysis.error_message = str(e)
                segment_analysis.completed_at = datetime.now()
                db.commit()
        finally:
            db.close()
    
    def _get_segment_video(self, segment_start: datetime) -> Optional[Path]:
        """해당 구간의 비디오 파일 경로 반환"""
        filename = f"segment_{segment_start.strftime('%Y%m%d_%H%M%S')}.mp4"
        video_path = self.buffer_dir / filename
        
        if video_path.exists():
            return video_path
        
        # 파일명이 정확히 일치하지 않을 수 있으므로 패턴 검색
        pattern = f"segment_{segment_start.strftime('%Y%m%d_%H%M')}*.mp4"
        matching_files = list(self.buffer_dir.glob(pattern))
        
        if matching_files:
            return matching_files[0]
        
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


def stop_segment_analysis_for_camera(camera_id: str):
    """특정 카메라의 10분 분석 스케줄러 중지"""
    if camera_id not in active_segment_schedulers:
        print(f"[10분 분석 스케줄러] 실행 중이 아님: {camera_id}")
        return
    
    scheduler = active_segment_schedulers[camera_id]
    scheduler.stop_scheduler()
    del active_segment_schedulers[camera_id]
    
    print(f"[10분 분석 스케줄러] 중지됨: {camera_id}")

