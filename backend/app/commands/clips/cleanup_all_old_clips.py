"""구버전 클립 데이터 완전 삭제 스크립트"""
import sys
from pathlib import Path


from app.database.session import SessionLocal
from app.models.clip import HighlightClip

def cleanup_all_old_clips():
    """
    구버전 클립 데이터 완전 삭제
    - video_url이 /temp_videos/로 시작하는 것 (아카이브 참조)
    - 신버전은 /videos/highlights/로 시작
    """
    db = SessionLocal()
    
    try:
        # 전체 클립 조회
        all_clips = db.query(HighlightClip).all()
        print(f"📊 전체 클립: {len(all_clips)}개\n")
        
        # 구버전 클립 (아카이브 참조)
        old_clips = [c for c in all_clips if c.video_url.startswith('/temp_videos/')]
        
        # 신버전 클립 (실제 하이라이트 파일)
        new_clips = [c for c in all_clips if c.video_url.startswith('/videos/highlights/')]
        
        print(f"🗑️  구버전 클립 (삭제 대상): {len(old_clips)}개")
        for clip in old_clips:
            print(f"   - ID {clip.id}: {clip.title}")
            print(f"     URL: {clip.video_url}")
        
        print(f"\n✅ 신버전 클립 (유지): {len(new_clips)}개")
        for clip in new_clips:
            print(f"   - ID {clip.id}: {clip.title} ({clip.duration_seconds}초)")
            print(f"     URL: {clip.video_url}")
        
        # 삭제 확인
        if old_clips:
            print(f"\n⚠️  {len(old_clips)}개의 구버전 클립을 삭제합니다...")
            
            for clip in old_clips:
                db.delete(clip)
            
            db.commit()
            print(f"✅ {len(old_clips)}개의 구버전 클립 삭제 완료!\n")
        else:
            print("\n✅ 삭제할 구버전 클립이 없습니다.\n")
        
        # 최종 상태
        remaining = db.query(HighlightClip).all()
        print(f"📊 최종 클립 개수: {remaining}개")
        
        if remaining:
            print("\n남은 클립 목록:")
            for clip in remaining:
                print(f"   - ID {clip.id}: {clip.title}")
                print(f"     파일: {clip.video_url}")
                print(f"     길이: {clip.duration_seconds}초")
                print(f"     생성: {clip.created_at}")
                print()
        
    except Exception as e:
        print(f"❌ 오류: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_all_old_clips()
