"""기존 클립 데이터 정리 스크립트"""
import sys
from pathlib import Path


from app.database.session import SessionLocal
from app.models.clip import HighlightClip

def cleanup_old_clips():
    """구버전 클립 데이터 삭제"""
    db = SessionLocal()
    
    try:
        # ID 24 이전의 모든 클립 삭제 (구버전)
        old_clips = db.query(HighlightClip).filter(HighlightClip.id < 24).all()
        
        print(f"🗑️  삭제할 구버전 클립: {len(old_clips)}개")
        
        for clip in old_clips:
            print(f"   - ID {clip.id}: {clip.title}")
            db.delete(clip)
        
        db.commit()
        print(f"\n✅ {len(old_clips)}개의 구버전 클립 삭제 완료!")
        
        # 남은 클립 확인
        remaining = db.query(HighlightClip).all()
        print(f"\n📊 남은 클립: {len(remaining)}개")
        for clip in remaining:
            print(f"   - ID {clip.id}: {clip.title} ({clip.video_url})")
            
    except Exception as e:
        print(f"❌ 오류: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_old_clips()
