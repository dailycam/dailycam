"""MariaDB 데이터베이스 초기화 및 더미 데이터 삽입"""

from datetime import date, timedelta
from app.database import engine, SessionLocal, Base, test_connection
from app.models.analytics.models import DailyStat, Incident, AnalyticsSummary


def init_db():
    """테이블 생성"""
    print("[CHECK] MariaDB Connection Testing...")
    if not test_connection():
        print("[ERROR] Database connection failed. Check .env DB settings.")
        return False
    
    print("[CREATE] Creating Tables...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables created successfully")
    return True


def insert_dummy_data():
    """더미 데이터 삽입 (Analytics 페이지 테스트용)"""
    db = SessionLocal()
    
    try:
        print("[DELETE] Deleting existing data...")
        db.query(DailyStat).delete()
        db.query(Incident).delete()
        db.query(AnalyticsSummary).delete()
        db.commit()
        
        print("[INSERT] Inserting daily statistics data...")
        # 1. 일별 통계 데이터 (최근 2주 - 비교를 위해)
        today = date.today()
        
        # 현재 주 (최근 7일)
        current_week_data = [
            {'days_ago': 6, 'safety': 85, 'incidents': 5, 'activity': 75},
            {'days_ago': 5, 'safety': 88, 'incidents': 3, 'activity': 80},
            {'days_ago': 4, 'safety': 92, 'incidents': 2, 'activity': 85},
            {'days_ago': 3, 'safety': 87, 'incidents': 4, 'activity': 78},
            {'days_ago': 2, 'safety': 90, 'incidents': 3, 'activity': 82},
            {'days_ago': 1, 'safety': 95, 'incidents': 1, 'activity': 88},
            {'days_ago': 0, 'safety': 93, 'incidents': 2, 'activity': 86},
        ]
        
        # 이전 주 (7-14일 전) - 비교 기준
        previous_week_data = [
            {'days_ago': 13, 'safety': 82, 'incidents': 7, 'activity': 70},
            {'days_ago': 12, 'safety': 84, 'incidents': 6, 'activity': 72},
            {'days_ago': 11, 'safety': 80, 'incidents': 8, 'activity': 68},
            {'days_ago': 10, 'safety': 83, 'incidents': 7, 'activity': 71},
            {'days_ago': 9, 'safety': 81, 'incidents': 6, 'activity': 69},
            {'days_ago': 8, 'safety': 85, 'incidents': 5, 'activity': 73},
            {'days_ago': 7, 'safety': 84, 'incidents': 6, 'activity': 72},
        ]
        
        # 현재 주 데이터 삽입
        for data in current_week_data:
            stat = DailyStat(
                date=today - timedelta(days=data['days_ago']),
                safety_score=data['safety'],
                incident_count=data['incidents'],
                activity_level=data['activity']
            )
            db.add(stat)
        
        # 이전 주 데이터 삽입
        for data in previous_week_data:
            stat = DailyStat(
                date=today - timedelta(days=data['days_ago']),
                safety_score=data['safety'],
                incident_count=data['incidents'],
                activity_level=data['activity']
            )
            db.add(stat)
        
        print("[INSERT] Inserting incident event data...")
        # 2. 위험 이벤트 데이터 (현재 주 + 이전 주)
        
        # 현재 주 위험 이벤트
        current_incidents_data = [
            {'type': '데드존 접근', 'count': 12, 'severity': 'high'},
            {'type': '낙상 위험', 'count': 8, 'severity': 'high'},
            {'type': '넘어짐', 'count': 5, 'severity': 'medium'},
            {'type': '부딪힘', 'count': 3, 'severity': 'low'},
            {'type': '질식 위험', 'count': 2, 'severity': 'high'},
        ]
        
        # 현재 주 이벤트 삽입 (0-6일 전)
        for incident_data in current_incidents_data:
            for i in range(incident_data['count']):
                incident = Incident(
                    incident_type=incident_data['type'],
                    occurred_date=today - timedelta(days=i % 7),
                    description=f"{incident_data['type']} 감지됨",
                    severity=incident_data['severity']
                )
                db.add(incident)
        
        # 이전 주 위험 이벤트 (더 많았던 상황 시뮬레이션)
        previous_incidents_data = [
            {'type': '데드존 접근', 'count': 15, 'severity': 'high'},
            {'type': '낙상 위험', 'count': 10, 'severity': 'high'},
            {'type': '넘어짐', 'count': 8, 'severity': 'medium'},
            {'type': '부딪힘', 'count': 5, 'severity': 'low'},
            {'type': '질식 위험', 'count': 4, 'severity': 'high'},
        ]
        
        # 이전 주 이벤트 삽입 (7-13일 전)
        for incident_data in previous_incidents_data:
            for i in range(incident_data['count']):
                incident = Incident(
                    incident_type=incident_data['type'],
                    occurred_date=today - timedelta(days=7 + (i % 7)),
                    description=f"{incident_data['type']} 감지됨 (이전주)",
                    severity=incident_data['severity']
                )
                db.add(incident)
        
        print("[INSERT] Inserting analytics summary data...")
        # 3. 통계 요약 데이터
        summary = AnalyticsSummary(
            period='week',
            avg_safety_score=89.0,
            total_incidents=30,
            safe_zone_percentage=91.0,
            incident_reduction_percentage=42.0
        )
        db.add(summary)
        
        db.commit()
        
        print("\n[SUCCESS] Dummy data insertion completed!")
        print(f"  [STATS] Daily statistics: {len(current_week_data) + len(previous_week_data)} records (current: {len(current_week_data)}, previous: {len(previous_week_data)})")
        print(f"  [INCIDENTS] Total incidents: {sum(i['count'] for i in current_incidents_data) + sum(i['count'] for i in previous_incidents_data)} records")
        print(f"     - Current week: {sum(i['count'] for i in current_incidents_data)}")
        print(f"     - Previous week: {sum(i['count'] for i in previous_incidents_data)}")
        print(f"  [SUMMARY] Analytics summary: 1 record\n")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error occurred: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def check_and_init():
    """데이터 확인 및 자동 초기화 (서버 startup용)"""
    db = SessionLocal()
    try:
        count = db.query(DailyStat).count()
        if count == 0:
            print("[EMPTY] Database is empty. Inserting dummy data...")
            db.close()
            return insert_dummy_data()
        else:
            print(f"[OK] Existing data found: {count} records")
            return True
    except Exception as e:
        print(f"[WARN] Error checking data: {e}")
        return False
    finally:
        if not db.is_active:
            db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("[START] MariaDB Database Initialization")
    print("=" * 60)
    print()
    
    if init_db():
        print()
        insert_dummy_data()
        print("=" * 60)
        print("[DONE] Database Ready!")
        print("=" * 60)

