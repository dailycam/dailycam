"""하이라이트 클립 현황 확인"""
import sys
from pathlib import Path

from app.database.session import SessionLocal
from app.models.clip import HighlightClip

db = SessionLocal()

try:
    total = db.query(HighlightClip).count()
    print(f"\n📊 총 클립 개수: {total}개\n")
    
    if total > 0:
        print("=" * 80)
        clips = db.query(HighlightClip).limit(5).all()
        for c in clips:
            print(f"\nID: {c.id}")
            print(f"제목: {c.title}")
            print(f"카테고리: {c.category}")
            print(f"비디오: {c.video_url}")
            print(f"썸네일: {c.thumbnail_url}")
            print(f"시간: {c.duration_seconds}초")
            
            # 파일 존재 확인
            if c.video_url:
                video_path = Path(c.video_url.lstrip('/'))
                print(f"비디오 파일 존재: {video_path.exists()} ({video_path})")
            
            print("-" * 80)
    else:
        print("⚠️  클립이 하나도 없습니다!")
        print("\n해결 방법:")
        print("1. 분석 워커가 실행 중인지 확인")
        print("2. SegmentAnalysis에 데이터가 있는지 확인")
        print("3. 수동으로 클립 생성: POST /api/clips/generate/camera-1")
        
finally:
    db.close()
