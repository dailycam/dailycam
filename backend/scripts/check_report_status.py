"""리포트 상태 확인 스크립트"""

import sys
from pathlib import Path

# .env 로드
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

from app.database import SessionLocal
from app.models.daily_report.models import (
    DailyReport,
    VideoAnalysis,
    Video,
)

def check_report_status():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("리포트 상태 확인")
        print("=" * 60)
        
        # 1. 비디오 확인
        video_count = db.query(Video).count()
        print(f"\n1. 비디오 개수: {video_count}")
        
        # 2. 분석 결과 확인
        analysis_count = db.query(VideoAnalysis).count()
        print(f"2. 분석 결과 개수: {analysis_count}")
        
        if analysis_count > 0:
            analyses = db.query(VideoAnalysis).order_by(VideoAnalysis.created_at.desc()).limit(3).all()
            print(f"\n   최근 분석 결과:")
            for a in analyses:
                print(f"   - Analysis ID: {a.id}, Video ID: {a.video_id}, Safety Score: {a.safety_score}")
        
        # 3. 리포트 확인
        report_count = db.query(DailyReport).count()
        print(f"\n3. 리포트 개수: {report_count}")
        
        if report_count > 0:
            reports = db.query(DailyReport).order_by(DailyReport.created_at.desc()).limit(3).all()
            print(f"\n   최근 리포트:")
            for r in reports:
                print(f"   - Report ID: {r.id}, Analysis ID: {r.analysis_id}")
                print(f"     Created At: {r.created_at}")
                print(f"     Summary: {r.overall_summary[:50] if r.overall_summary else 'None'}...")
        else:
            print("\n   [경고] 리포트가 없습니다!")
            print("   -> 리포트를 생성하려면 비디오 분석 후 리포트 생성 API를 호출해야 합니다.")
        
        # 4. 리포트 생성 여부 확인
        if analysis_count > 0 and report_count == 0:
            print("\n" + "=" * 60)
            print("[문제 발견] 분석 결과는 있지만 리포트가 없습니다!")
            print("=" * 60)
            print("\n가능한 원인:")
            print("1. 리포트 생성 API가 호출되지 않았습니다")
            print("2. 리포트 생성 중 오류가 발생했습니다")
            print("3. 리포트 생성은 성공했지만 DB 저장에 실패했습니다")
            print("\n해결 방법:")
            print("- 백엔드 로그에서 '[요청] 리포트 생성' 메시지를 확인하세요")
            print("- 백엔드 로그에서 '[성공] 리포트 저장 완료' 메시지를 확인하세요")
            print("- 백엔드 로그에서 '[오류]' 메시지를 확인하세요")
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        import traceback
        print(f"[오류] 오류 발생: {e}")
        print(traceback.format_exc())
    finally:
        db.close()

if __name__ == "__main__":
    check_report_status()

