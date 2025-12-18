"""클립 하이라이트 자동 삭제 서비스 - 7일 이상 된 클립 삭제"""

import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.clip import HighlightClip
from app.services.s3_service import S3Service


class ClipCleanupService:
    """클립 하이라이트 자동 삭제 서비스"""
    
    def __init__(self, retention_days: int = 7):
        """
        Args:
            retention_days: 클립 보관 기간 (일) - 기본값 7일
        """
        self.retention_days = retention_days
        self.s3_service = S3Service()
    
    def cleanup_old_clips(self, db: Session = None) -> dict:
        """
        7일 이상 된 클립을 S3와 DB에서 삭제
        
        Args:
            db: 데이터베이스 세션 (None이면 새로 생성)
        
        Returns:
            삭제 결과 통계
        """
        should_close_db = False
        if db is None:
            db = next(get_db())
            should_close_db = True
        
        try:
            # 삭제 기준 날짜 계산
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.retention_days)
            
            print(f"[ClipCleanup] 🗑️ 클립 정리 시작 (기준: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')} UTC 이전)")
            
            # 오래된 클립 조회
            old_clips = db.query(HighlightClip).filter(
                HighlightClip.created_at < cutoff_date
            ).all()
            
            if not old_clips:
                print(f"[ClipCleanup] ℹ️ 삭제할 클립 없음")
                return {
                    "total_found": 0,
                    "s3_deleted": 0,
                    "db_deleted": 0,
                    "errors": []
                }
            
            print(f"[ClipCleanup] 📋 삭제 대상: {len(old_clips)}개 클립")
            
            s3_deleted_count = 0
            db_deleted_count = 0
            errors = []
            
            for clip in old_clips:
                try:
                    clip_id = str(clip.id)
                    clip_age_days = (datetime.now(timezone.utc) - clip.created_at).days
                    
                    # S3에서 삭제
                    if self.s3_service.is_enabled():
                        s3_success = self.s3_service.delete_clip(clip_id)
                        if s3_success:
                            s3_deleted_count += 1
                        else:
                            errors.append(f"클립 {clip_id}: S3 삭제 실패")
                    else:
                        # S3가 비활성화된 경우 URL 기반 삭제 시도
                        if clip.video_url and ("s3" in clip.video_url or "amazonaws.com" in clip.video_url):
                            self.s3_service.delete_by_url(clip.video_url)
                        if clip.thumbnail_url and ("s3" in clip.thumbnail_url or "amazonaws.com" in clip.thumbnail_url):
                            self.s3_service.delete_by_url(clip.thumbnail_url)
                    
                    # DB에서 삭제
                    db.delete(clip)
                    db_deleted_count += 1
                    
                    print(f"[ClipCleanup] ✅ 삭제 완료: 클립 ID {clip_id} ({clip_age_days}일 경과)")
                    
                except Exception as e:
                    error_msg = f"클립 {clip.id} 삭제 중 오류: {str(e)}"
                    errors.append(error_msg)
                    print(f"[ClipCleanup] ❌ {error_msg}")
            
            # 변경사항 커밋
            db.commit()
            
            print(f"[ClipCleanup] ✅ 정리 완료: S3 {s3_deleted_count}개, DB {db_deleted_count}개 삭제")
            if errors:
                print(f"[ClipCleanup] ⚠️ 오류 발생: {len(errors)}개")
            
            return {
                "total_found": len(old_clips),
                "s3_deleted": s3_deleted_count,
                "db_deleted": db_deleted_count,
                "errors": errors
            }
            
        except Exception as e:
            print(f"[ClipCleanup] ❌ 정리 중 오류 발생: {e}")
            if db:
                db.rollback()
            raise
        finally:
            if should_close_db and db:
                db.close()
    
    async def run_periodic_cleanup(self, interval_hours: int = 24):
        """
        주기적으로 클립 정리 실행 (백그라운드 태스크)
        
        Args:
            interval_hours: 실행 간격 (시간) - 기본값 24시간
        """
        print(f"[ClipCleanup] 🔄 주기적 정리 시작 (간격: {interval_hours}시간)")
        
        while True:
            try:
                self.cleanup_old_clips()
            except Exception as e:
                print(f"[ClipCleanup] ❌ 주기적 정리 중 오류: {e}")
            
            # 다음 실행까지 대기
            await asyncio.sleep(interval_hours * 3600)


def cleanup_old_clips_command(retention_days: int = 7):
    """
    명령줄에서 실행할 수 있는 클립 정리 함수
    
    Usage:
        python -c "from app.services.clip_cleanup_service import cleanup_old_clips_command; cleanup_old_clips_command()"
    """
    service = ClipCleanupService(retention_days=retention_days)
    result = service.cleanup_old_clips()
    
    print("\n" + "="*50)
    print("클립 정리 결과")
    print("="*50)
    print(f"발견된 클립: {result['total_found']}개")
    print(f"S3 삭제: {result['s3_deleted']}개")
    print(f"DB 삭제: {result['db_deleted']}개")
    if result['errors']:
        print(f"\n오류 ({len(result['errors'])}개):")
        for error in result['errors']:
            print(f"  - {error}")
    print("="*50)

