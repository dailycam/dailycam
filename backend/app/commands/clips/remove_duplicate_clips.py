"""중복 클립 제거 스크립트"""

import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가

from app.database import SessionLocal
from app.models.clip import HighlightClip
from sqlalchemy import func

def remove_duplicate_clips():
    """제목, 설명, 생성시간이 동일한 중복 클립 제거"""
    db = SessionLocal()
    
    try:
        # 모든 클립 조회
        all_clips = db.query(HighlightClip).order_by(HighlightClip.created_at.desc()).all()
        
        print(f"📊 전체 클립 수: {len(all_clips)}")
        
        # 중복 감지 (제목 + 설명 + 생성시간 기준)
        seen = set()
        duplicates = []
        
        for clip in all_clips:
            # 생성시간을 분 단위로 반올림 (같은 분석에서 생성된 클립)
            created_minute = clip.created_at.replace(second=0, microsecond=0) if clip.created_at else None
            key = (clip.title, clip.description, created_minute)
            
            if key in seen:
                duplicates.append(clip)
                print(f"🔍 중복 발견: ID={clip.id}, 제목={clip.title}")
            else:
                seen.add(key)
        
        if not duplicates:
            print("✅ 중복 클립이 없습니다!")
            return
        
        print(f"\n⚠️  총 {len(duplicates)}개의 중복 클립 발견")
        print("삭제할 클립:")
        for clip in duplicates:
            print(f"  - ID: {clip.id}, 제목: {clip.title}, 생성: {clip.created_at}")
        
        # 자동 삭제
        for clip in duplicates:
            db.delete(clip)
        db.commit()
        print(f"\n✅ {len(duplicates)}개의 중복 클립 자동 삭제 완료!")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    remove_duplicate_clips()
