"""데이터베이스의 SegmentAnalysis 데이터 확인 스크립트"""

import sys
from pathlib import Path
import json



from app.database.session import get_db
from app.models.live_monitoring.models import SegmentAnalysis
from datetime import datetime, timedelta

def check_segment_data():
    """SegmentAnalysis 데이터 확인"""
    db = next(get_db())
    
    try:
        # 오늘 날짜의 세그먼트 조회
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
        
        segments = db.query(SegmentAnalysis).filter(
            SegmentAnalysis.camera_id == "camera-1",
            SegmentAnalysis.segment_start >= today_start,
            SegmentAnalysis.segment_start <= today_end,
            SegmentAnalysis.status == 'completed'
        ).order_by(SegmentAnalysis.segment_start.desc()).limit(5).all()
        
        print(f"🔍 오늘 분석된 세그먼트 개수: {len(segments)}")
        print("=" * 80)
        
        for i, segment in enumerate(segments, 1):
            print(f"\n[세그먼트 {i}]")
            print(f"  ID: {segment.id}")
            print(f"  시간: {segment.segment_start} ~ {segment.segment_end}")
            print(f"  안전 점수: {segment.safety_score}")
            print(f"  발달 점수: {segment.development_score}")
            print(f"  사건 수: {segment.incident_count}")
            
            if segment.analysis_result:
                result = segment.analysis_result
                
                # 안전 분석
                safety_analysis = result.get('safety_analysis', {})
                incident_events = safety_analysis.get('incident_events', [])
                
                print(f"\n  📊 안전 이벤트 개수: {len(incident_events)}")
                for j, incident in enumerate(incident_events[:3], 1):  # 최대 3개만 표시
                    print(f"    [{j}] severity: {incident.get('severity', 'N/A')}")
                    print(f"        risk_type: {incident.get('risk_type', 'N/A')}")
                    print(f"        title: {incident.get('title', 'N/A')}")
                    print(f"        description: {incident.get('description', 'N/A')[:100]}")
                
                # 발달 분석
                development_analysis = result.get('development_analysis', {})
                skills = development_analysis.get('skills', [])
                
                print(f"\n  📊 발달 스킬 개수: {len(skills)}")
                for j, skill in enumerate(skills[:3], 1):  # 최대 3개만 표시
                    if skill.get('present', False):
                        print(f"    [{j}] category: {skill.get('category', 'N/A')}")
                        print(f"        name: {skill.get('name', 'N/A')}")
                        print(f"        level: {skill.get('level', 'N/A')}")
                        print(f"        frequency: {skill.get('frequency', 0)}")
            
            print("-" * 80)
        
    finally:
        db.close()

if __name__ == "__main__":
    check_segment_data()
