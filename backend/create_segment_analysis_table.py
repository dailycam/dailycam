"""
SegmentAnalysis 테이블 생성 스크립트
5분 단위 분석 시스템을 위한 데이터베이스 마이그레이션
"""

from app.database.base import Base
from app.database.session import engine
from app.models.live_monitoring.models import SegmentAnalysis, DailyReport

def create_segment_analysis_table():
    """SegmentAnalysis 및 DailyReport 테이블 생성"""
    try:
        # 테이블 생성
        Base.metadata.create_all(bind=engine, tables=[
            SegmentAnalysis.__table__,
            DailyReport.__table__
        ])
        
        print("✅ 테이블 생성 완료:")
        print("  - segment_analyses: 5분 단위 분석 결과")
        print("  - daily_reports: 일일 리포트 (업데이트됨)")
        print("\n📊 테이블 구조:")
        print("\nsegment_analyses:")
        print("  - id (PK)")
        print("  - camera_id (인덱스)")
        print("  - segment_start (인덱스) - 5분 구간 시작")
        print("  - segment_end - 5분 구간 종료")
        print("  - video_path - 분석한 비디오 경로")
        print("  - s3_url - S3 URL (선택)")
        print("  - analysis_result (JSON) - Gemini 분석 전체 결과")
        print("  - status - pending/processing/completed/failed")
        print("  - error_message - 오류 메시지")
        print("  - created_at - 생성 시간")
        print("  - completed_at - 완료 시간")
        print("  - safety_score - 안전 점수")
        print("  - incident_count - 사건 수")
        
        print("\ndaily_reports (업데이트됨):")
        print("  - segment_analyses_ids (JSON) - 5분 단위 분석 ID 배열")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=" * 60)
    print("5분 단위 분석 시스템 데이터베이스 마이그레이션")
    print("=" * 60)
    print()
    
    create_segment_analysis_table()
    
    print()
    print("=" * 60)
    print("마이그레이션 완료!")
    print("=" * 60)
    print()
    print("다음 단계:")
    print("1. 백엔드 서버 재시작: python run.py")
    print("2. 스트림 시작: POST /api/live-monitoring/start-stream/camera-1")
    print("3. 5분 후 segment_*.mp4 파일 확인")
    print("4. 5분 30초 후 자동 분석 시작")
    print("5. 일일 리포트 조회: GET /api/live-monitoring/daily-report/camera-1?date=2024-12-02")
    print()

