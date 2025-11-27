"""기존 분석 결과를 DB에 저장하는 스크립트"""

import sys
import json
from pathlib import Path
from datetime import datetime

# 프로젝트 루트를 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.database import SessionLocal
from app.utils.json_to_db_mapper import JsonToDbMapper


def import_existing_analyses():
    """analysis_results 폴더의 JSON 파일들을 DB에 저장"""
    db = SessionLocal()
    mapper = JsonToDbMapper()
    
    try:
        print("=" * 80)
        print("Importing Existing Analysis Results to Database")
        print("=" * 80)
        print()
        
        # analysis_results 폴더 경로
        results_dir = project_root / "backend" / "analysis_results"
        
        if not results_dir.exists():
            print(f"❌ Directory not found: {results_dir}")
            return False
        
        # raw_*.json 파일들 찾기
        json_files = list(results_dir.glob("raw_stage*_final_*.json"))
        
        if not json_files:
            print("❌ No analysis JSON files found")
            return False
        
        print(f"Found {len(json_files)} analysis files:")
        for f in json_files:
            print(f"  - {f.name}")
        print()
        
        imported_count = 0
        
        for json_file in json_files:
            print(f"Processing: {json_file.name}")
            
            try:
                # JSON 파일 읽기
                with open(json_file, 'r', encoding='utf-8') as f:
                    analysis_data = json.load(f)
                
                # 메타 정보 추출
                meta = analysis_data.get("meta", {})
                stage = meta.get("assumed_stage", "unknown")
                
                print(f"  Stage: {stage}")
                print(f"  Video Quality: {meta.get('video_quality', 'N/A')}")
                
                # DB에 저장
                saved_analysis = mapper.save_analysis_to_db(
                    db=db,
                    child_id=1,  # 더미 아이 ID
                    user_id=1,   # 더미 사용자 ID
                    analysis_data=analysis_data,
                    video_file_path=f"imported_{json_file.stem}.mp4",
                    video_file_size=None
                )
                
                print(f"  ✅ Saved with ID: {saved_analysis.id}")
                print(f"     - Safety Score: {saved_analysis.safety_score}")
                print(f"     - Skills: {len(saved_analysis.skills)}")
                print(f"     - Incidents: {len(saved_analysis.safety_incidents)}")
                print()
                
                imported_count += 1
                
            except Exception as e:
                print(f"  ⚠️  Failed to import {json_file.name}: {e}")
                import traceback
                traceback.print_exc()
                print()
                continue
        
        print("=" * 80)
        print(f"✅ Successfully imported {imported_count}/{len(json_files)} analyses")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = import_existing_analyses()
    sys.exit(0 if success else 1)
