"""자동 정리 서비스 - 오래된 파일 및 데이터 정리"""

import asyncio
from pathlib import Path
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.live_monitoring.models import SegmentAnalysis
from app.models.clip import HighlightClip
from app.models.camera_setting import CameraSetting, CameraVideo
from sqlalchemy import and_


class CleanupService:
    """파일 및 데이터베이스 자동 정리 서비스"""
    
    def __init__(self):
        self.backend_dir = Path(__file__).resolve().parents[2]
        self.is_running = False
    
    async def start_cleanup_scheduler(self):
        """정리 스케줄러 시작 (매일 새벽 3시 실행)"""
        self.is_running = True
        print("[자동 정리] 스케줄러 시작")
        
        while self.is_running:
            # 다음 실행 시간 계산 (새벽 3시)
            now = datetime.now()
            next_run = now.replace(hour=3, minute=0, second=0, microsecond=0)
            
            # 이미 지난 시간이면 다음 날로
            if next_run <= now:
                next_run += timedelta(days=1)
            
            wait_seconds = (next_run - now).total_seconds()
            
            print(f"[자동 정리] 다음 실행: {next_run.strftime('%Y-%m-%d %H:%M:%S')} ({wait_seconds/3600:.1f}시간 후)")
            
            # 대기
            await asyncio.sleep(wait_seconds)
            
            if self.is_running:
                await self.run_cleanup()
        
        print("[자동 정리] 스케줄러 종료")
    
    async def run_cleanup(self):
        """전체 정리 작업 실행"""
        print("\n" + "="*60)
        print(f"[자동 정리] 정리 작업 시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        db = next(get_db())
        
        try:
            # 1. 오래된 아카이브 파일 정리
            await self.cleanup_old_archives(db)
            
            # 2. 오래된 하이라이트 클립 정리
            await self.cleanup_old_highlights(db)
            
            # 3. 임시 파일 정리 (HLS 버퍼)
            await self.cleanup_temp_files()
            
            print("\n[자동 정리] ✅ 정리 작업 완료")
            
        except Exception as e:
            print(f"[자동 정리] ❌ 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()
    
    async def cleanup_old_archives(self, db: Session):
        """
        오래된 아카이브 파일 정리
        - 분석 완료 후 7일이 지난 아카이브 삭제
        - 분석되지 않은 아카이브는 30일 후 삭제
        """
        print("\n[아카이브 정리] 시작...")
        
        archive_base_dir = self.backend_dir / "temp_videos" / "hls_buffer"
        
        if not archive_base_dir.exists():
            print("[아카이브 정리] 아카이브 디렉토리가 없습니다")
            return
        
        total_deleted = 0
        total_size_freed = 0
        
        # 각 카메라 디렉토리 순회
        for camera_dir in archive_base_dir.iterdir():
            if not camera_dir.is_dir():
                continue
            
            archive_dir = camera_dir / "archive"
            if not archive_dir.exists():
                continue
            
            camera_id = camera_dir.name
            
            # 아카이브 파일 목록
            archive_files = list(archive_dir.glob("archive_*.mp4"))
            
            for archive_file in archive_files:
                try:
                    # 파일 생성 시간
                    file_age_days = (datetime.now() - datetime.fromtimestamp(archive_file.stat().st_mtime)).days
                    
                    # 분석 완료 여부 확인
                    # 파일명에서 시간 추출: archive_20241209_143000.mp4
                    filename = archive_file.stem  # archive_20241209_143000
                    time_str = filename.replace('archive_', '')  # 20241209_143000
                    
                    try:
                        file_time = datetime.strptime(time_str, '%Y%m%d_%H%M%S')
                        
                        # 해당 시간대의 분석 결과 확인
                        segment_analysis = db.query(SegmentAnalysis).filter(
                            SegmentAnalysis.camera_id == camera_id,
                            SegmentAnalysis.segment_start <= file_time,
                            SegmentAnalysis.segment_end > file_time,
                            SegmentAnalysis.status == 'completed'
                        ).first()
                        
                        should_delete = False
                        reason = ""
                        
                        if segment_analysis:
                            # 분석 완료된 파일: 7일 후 삭제
                            # 단, 클립 생성 실패 후 재시도를 위해 최대 8일까지 보호 (2일 연장)
                            # 스토리지 부담 최소화: 대부분의 클립은 분석 직후 생성되므로, 
                            # 7일이 지난 파일 중 최근 1일 이내만 추가 보호
                            if file_age_days >= 7:
                                # 분석 완료 후 7일 이상 지났지만, 최근 1일 이내면 클립 생성 실패 후 재시도 가능성
                                # 스토리지 부담을 줄이기 위해 보호 기간을 최소화 (7일 → 최대 8일)
                                # 대부분의 클립은 분석 직후 생성되므로, 7일이 지난 파일 중 최근 1일만 추가 보호
                                if file_age_days < 8:
                                    should_delete = False
                                    reason = f"클립 생성 보호 기간 (분석 완료 후 {file_age_days}일, 최대 8일까지 보호)"
                                else:
                                    should_delete = True
                                    reason = f"분석 완료 후 {file_age_days}일 경과"
                        else:
                            # 분석되지 않은 파일: 30일 후 삭제
                            if file_age_days >= 30:
                                should_delete = True
                                reason = f"분석 안됨, {file_age_days}일 경과"
                        
                        if should_delete:
                            file_size = archive_file.stat().st_size
                            archive_file.unlink()
                            total_deleted += 1
                            total_size_freed += file_size
                            print(f"  🗑️ 삭제: {archive_file.name} ({reason})")
                    
                    except ValueError:
                        # 파일명 파싱 실패
                        if file_age_days >= 30:
                            file_size = archive_file.stat().st_size
                            archive_file.unlink()
                            total_deleted += 1
                            total_size_freed += file_size
                            print(f"  🗑️ 삭제: {archive_file.name} (형식 불명, {file_age_days}일 경과)")
                
                except Exception as e:
                    print(f"  ⚠️ 파일 처리 오류: {archive_file.name} - {e}")
        
        print(f"\n[아카이브 정리] 완료: {total_deleted}개 파일 삭제, {total_size_freed/1024/1024:.1f}MB 확보")
    
    async def cleanup_old_highlights(self, db: Session):
        """
        오래된 하이라이트 클립 정리
        - 30일이 지난 클립 삭제
        """
        print("\n[하이라이트 정리] 시작...")
        
        cutoff_date = datetime.now() - timedelta(days=30)
        
        # DB에서 오래된 클립 조회
        old_clips = db.query(HighlightClip).filter(
            HighlightClip.created_at < cutoff_date
        ).all()
        
        if not old_clips:
            print("[하이라이트 정리] 삭제할 클립이 없습니다")
            return
        
        total_deleted = 0
        total_size_freed = 0
        
        for clip in old_clips:
            try:
                # 비디오 파일 삭제
                video_path = self.backend_dir / clip.video_url.lstrip('/')
                if video_path.exists():
                    file_size = video_path.stat().st_size
                    video_path.unlink()
                    total_size_freed += file_size
                
                # 썸네일 삭제
                if clip.thumbnail_url:
                    thumbnail_path = self.backend_dir / clip.thumbnail_url.lstrip('/')
                    if thumbnail_path.exists():
                        thumbnail_path.unlink()
                
                # DB에서 삭제
                db.delete(clip)
                total_deleted += 1
                
                age_days = (datetime.now() - clip.created_at).days
                print(f"  🗑️ 삭제: {clip.title} ({age_days}일 경과)")
            
            except Exception as e:
                print(f"  ⚠️ 클립 삭제 오류: {clip.title} - {e}")
        
        db.commit()
        
        print(f"\n[하이라이트 정리] 완료: {total_deleted}개 클립 삭제, {total_size_freed/1024/1024:.1f}MB 확보")
    
    async def cleanup_temp_files(self):
        """
        임시 파일 정리
        - HLS 세그먼트 파일 (이미 자동 삭제되지만, 남은 것 정리)
        """
        print("\n[임시 파일 정리] 시작...")
        
        hls_base_dir = self.backend_dir / "temp_videos" / "hls_buffer"
        
        if not hls_base_dir.exists():
            print("[임시 파일 정리] HLS 디렉토리가 없습니다")
            return
        
        total_deleted = 0
        total_size_freed = 0
        
        # 각 카메라의 HLS 디렉토리 정리
        for camera_dir in hls_base_dir.iterdir():
            if not camera_dir.is_dir():
                continue
            
            hls_dir = camera_dir / "hls"
            if not hls_dir.exists():
                continue
            
            # 1시간 이상 된 .ts 파일 삭제
            cutoff_time = datetime.now() - timedelta(hours=1)
            
            for ts_file in hls_dir.glob("*.ts"):
                try:
                    file_mtime = datetime.fromtimestamp(ts_file.stat().st_mtime)
                    
                    if file_mtime < cutoff_time:
                        file_size = ts_file.stat().st_size
                        ts_file.unlink()
                        total_deleted += 1
                        total_size_freed += file_size
                
                except Exception as e:
                    print(f"  ⚠️ 파일 삭제 오류: {ts_file.name} - {e}")
        
        if total_deleted > 0:
            print(f"\n[임시 파일 정리] 완료: {total_deleted}개 파일 삭제, {total_size_freed/1024/1024:.1f}MB 확보")
        else:
            print("[임시 파일 정리] 삭제할 파일이 없습니다")
    
    def stop(self):
        """정리 스케줄러 중지"""
        self.is_running = False
        print("[자동 정리] 중지 요청")


# 전역 인스턴스
_cleanup_service = None


def get_cleanup_service() -> CleanupService:
    """CleanupService 싱글톤 인스턴스 반환"""
    global _cleanup_service
    if _cleanup_service is None:
        _cleanup_service = CleanupService()
    return _cleanup_service


async def start_cleanup_scheduler():
    """정리 스케줄러 시작 (main.py에서 호출)"""
    service = get_cleanup_service()
    await service.start_cleanup_scheduler()


def stop_cleanup_scheduler():
    """정리 스케줄러 중지"""
    service = get_cleanup_service()
    service.stop()

