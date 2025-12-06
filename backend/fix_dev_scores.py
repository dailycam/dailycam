"""기존 데이터의 development_score 즉시 업데이트"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models.live_monitoring.models import SegmentAnalysis
from datetime import datetime, date

def update_now():
    db = next(get_db())
    try:
        # 오늘 날짜의 모든 SegmentAnalysis 조회
        today = date.today()
        segments = db.query(SegmentAnalysis).filter(
            SegmentAnalysis.status == 'completed',
            SegmentAnalysis.analysis_result.isnot(None)
        ).all()
        
        updated = 0
        for segment in segments:
            try:
                result = segment.analysis_result
                if not result:
                    continue
                
                dev_analysis = result.get('development_analysis', {})
                dev_score = dev_analysis.get('development_score')
                
                if dev_score is not None and (segment.development_score is None or segment.development_score == 0):
                    segment.development_score = dev_score
                    segment.development_radar_scores = dev_analysis.get('radar_scores', {})
                    
                    safety_analysis = result.get('safety_analysis', {})
                    segment.safety_incidents = safety_analysis.get('incident_events', [])
                    
                    updated += 1
                    print(f"✅ ID {segment.id}: {segment.segment_start} -> dev_score={dev_score}")
            except Exception as e:
                print(f"⚠️ ID {segment.id} 실패: {e}")
                continue
        
        db.commit()
        print(f"\n✅ 총 {updated}개 업데이트 완료!")
        
    finally:
        db.close()

if __name__ == "__main__":
    update_now()
