"""기존 SegmentAnalysis 데이터에 development_score 업데이트 (간단 버전)"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine, text
from app.database import get_db_url
import json

def update_existing_segments():
    """이미 분석된 SegmentAnalysis에 development_score 추가"""
    
    db_url = get_db_url()
    engine = create_engine(db_url)
    
    print("🔄 기존 SegmentAnalysis 데이터 업데이트 시작...")
    
    with engine.connect() as conn:
        # development_score가 NULL인 레코드 조회
        result = conn.execute(text("""
            SELECT id, analysis_result 
            FROM segment_analyses 
            WHERE (development_score IS NULL OR development_score = 0)
            AND analysis_result IS NOT NULL
            AND status = 'completed'
            AND DATE(segment_start) = CURDATE()
            ORDER BY segment_start DESC
        """))
        
        rows = result.fetchall()
        print(f"📊 업데이트할 레코드: {len(rows)}개")
        
        updated_count = 0
        
        for row in rows:
            segment_id = row[0]
            analysis_result_json = row[1]
            
            try:
                # JSON 파싱
                if isinstance(analysis_result_json, str):
                    analysis_result = json.loads(analysis_result_json)
                else:
                    analysis_result = analysis_result_json
                
                # development_analysis 추출
                development_analysis = analysis_result.get('development_analysis', {})
                development_score = development_analysis.get('development_score')
                
                if development_score is None:
                    print(f"  ⚠️  ID {segment_id}: development_score 없음, 건너뜀")
                    continue
                
                radar_scores = development_analysis.get('radar_scores', {})
                
                # safety_analysis 추출
                safety_analysis = analysis_result.get('safety_analysis', {})
                safety_incidents = safety_analysis.get('incident_events', [])
                
                # 업데이트
                conn.execute(text("""
                    UPDATE segment_analyses 
                    SET development_score = :dev_score,
                        development_radar_scores = :radar_scores,
                        safety_incidents = :safety_incidents
                    WHERE id = :id
                """), {
                    'dev_score': development_score,
                    'radar_scores': json.dumps(radar_scores) if radar_scores else None,
                    'safety_incidents': json.dumps(safety_incidents) if safety_incidents else None,
                    'id': segment_id
                })
                
                conn.commit()
                updated_count += 1
                print(f"  ✅ ID {segment_id}: development_score = {development_score}")
                
            except Exception as e:
                print(f"  ⚠️  ID {segment_id} 업데이트 실패: {e}")
                continue
        
        print(f"\n✅ 업데이트 완료: {updated_count}/{len(rows)}개")
        print("\n다음 단계:")
        print("1. 페이지 새로고침 (Ctrl + F5)")
        print("2. 16시, 17시, 18시 시간대 클릭 → 발달 점수 확인")

if __name__ == "__main__":
    update_existing_segments()
