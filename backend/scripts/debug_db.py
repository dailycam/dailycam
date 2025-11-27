"""DB 상태 확인 스크립트"""

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
    ReportTimeSlot,
    ReportRiskPriority,
    ReportActionRecommendation,
    Highlight
)

def check_db():
    db = SessionLocal()
    try:
        print("=" * 50)
        print("DB 상태 확인")
        print("=" * 50)
        
        # 1. 비디오 확인
        video_count = db.query(Video).count()
        print(f"\n1. 비디오 개수: {video_count}")
        if video_count > 0:
            videos = db.query(Video).limit(3).all()
            for v in videos:
                print(f"   - Video ID: {v.id}, 파일명: {v.filename}")
        
        # 2. 분석 결과 확인
        analysis_count = db.query(VideoAnalysis).count()
        print(f"\n2. 분석 결과 개수: {analysis_count}")
        if analysis_count > 0:
            analyses = db.query(VideoAnalysis).limit(3).all()
            for a in analyses:
                print(f"   - Analysis ID: {a.id}, Video ID: {a.video_id}, Safety Score: {a.safety_score}")
        
        # 3. 리포트 확인
        report_count = db.query(DailyReport).count()
        print(f"\n3. 리포트 개수: {report_count}")
        
        if report_count > 0:
            reports = db.query(DailyReport).order_by(DailyReport.created_at.desc()).limit(3).all()
            for r in reports:
                print(f"\n   리포트 ID: {r.id}")
                print(f"   - Analysis ID: {r.analysis_id}")
                print(f"   - Report Date: {r.report_date}")
                print(f"   - Created At: {r.created_at}")
                print(f"   - Overall Summary: {r.overall_summary[:50] if r.overall_summary else 'None'}...")
                
                # 관계 데이터 확인
                time_slots = db.query(ReportTimeSlot).filter(ReportTimeSlot.report_id == r.id).all()
                risks = db.query(ReportRiskPriority).filter(ReportRiskPriority.report_id == r.id).all()
                actions = db.query(ReportActionRecommendation).filter(ReportActionRecommendation.report_id == r.id).all()
                highlights = db.query(Highlight).filter(Highlight.report_id == r.id).all()
                
                print(f"   - Time Slots: {len(time_slots)}개")
                print(f"   - Risk Priorities: {len(risks)}개")
                print(f"   - Action Recommendations: {len(actions)}개")
                print(f"   - Highlights: {len(highlights)}개")
        else:
            print("   [경고] 리포트가 없습니다!")
        
        # 4. 최신 리포트 조회 테스트
        print(f"\n4. 최신 리포트 조회 테스트")
        from app.services.daily_report.repository import DailyReportRepository
        from app.services.daily_report.service import DailyReportService
        
        repo = DailyReportRepository(db)
        latest_report = repo.get_latest_daily_report()
        
        if latest_report:
            print(f"   [성공] 최신 리포트 찾음: ID={latest_report.id}")
            service = DailyReportService(None)  # highlight_generator는 None으로
            report_dict = service._report_to_dict(latest_report)
            print(f"   [성공] 딕셔너리 변환 성공")
            print(f"   - Keys: {list(report_dict.keys())}")
            print(f"   - report_id: {report_dict.get('report_id')}")
            print(f"   - time_slots 개수: {len(report_dict.get('time_slots', []))}")
        else:
            print(f"   [실패] 최신 리포트 없음")
        
        print("\n" + "=" * 50)
        
    except Exception as e:
        import traceback
        print(f"[오류] 오류 발생: {e}")
        print(traceback.format_exc())
    finally:
        db.close()

if __name__ == "__main__":
    check_db()

