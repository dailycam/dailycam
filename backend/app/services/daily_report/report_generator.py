"""일일 리포트 자동 생성 서비스"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Optional

from app.models.live_monitoring.models import SegmentAnalysis, RealtimeEvent, DailyReport
from app.database.session import get_db


class DailyReportGenerator:
    """
    하루 치 데이터를 집계하여 일일 리포트 생성
    """
    
    def __init__(self, camera_id: str, report_date: datetime):
        self.camera_id = camera_id
        self.report_date = report_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
    async def generate_report(self) -> Optional[DailyReport]:
        """일일 리포트 생성"""
        db = next(get_db())
        
        try:
            # 1. 해당 날짜의 5분 단위 분석 결과 조회
            day_start = self.report_date
            day_end = day_start + timedelta(days=1)
            
            segments = db.query(SegmentAnalysis).filter(
                SegmentAnalysis.camera_id == self.camera_id,
                SegmentAnalysis.segment_start >= day_start,
                SegmentAnalysis.segment_start < day_end,
                SegmentAnalysis.status == 'completed'
            ).order_by(SegmentAnalysis.segment_start).all()
            
            if not segments:
                print(f"[일일 리포트] 분석 데이터 없음: {self.report_date.date()}")
                return None
            
            # 2. 실시간 이벤트 조회
            events = db.query(RealtimeEvent).filter(
                RealtimeEvent.camera_id == self.camera_id,
                RealtimeEvent.timestamp >= day_start,
                RealtimeEvent.timestamp < day_end
            ).order_by(RealtimeEvent.timestamp).all()
            
            # 3. 안전 분석 집계
            safety_summary = self._aggregate_safety(segments, events)
            
            # 4. 발달 분석 집계
            development_summary = self._aggregate_development(segments)
            
            # 5. 시간대별 요약
            hourly_summary = self._create_hourly_summary(segments)
            
            # 6. 타임라인 이벤트
            timeline_events = self._create_timeline(events, segments)
            
            # 7. 일일 리포트 생성
            daily_report = DailyReport(
                camera_id=self.camera_id,
                report_date=self.report_date,
                total_hours_analyzed=len(segments) * 5 / 60,  # 5분 단위 → 시간
                average_safety_score=sum(s.safety_score for s in segments if s.safety_score) / len(segments) if segments else 100,
                total_incidents=sum(s.incident_count for s in segments if s.incident_count),
                safety_summary=safety_summary,
                development_summary=development_summary,
                hourly_summary=hourly_summary,
                timeline_events=timeline_events,
                segment_analyses_ids=[s.id for s in segments]
            )
            
            # 8. DB 저장 (기존 리포트가 있으면 업데이트)
            existing = db.query(DailyReport).filter(
                DailyReport.camera_id == self.camera_id,
                DailyReport.report_date == self.report_date
            ).first()
            
            if existing:
                # 업데이트
                existing.total_hours_analyzed = daily_report.total_hours_analyzed
                existing.average_safety_score = daily_report.average_safety_score
                existing.total_incidents = daily_report.total_incidents
                existing.safety_summary = daily_report.safety_summary
                existing.development_summary = daily_report.development_summary
                existing.hourly_summary = daily_report.hourly_summary
                existing.timeline_events = daily_report.timeline_events
                existing.segment_analyses_ids = daily_report.segment_analyses_ids
                existing.updated_at = datetime.now()
                daily_report = existing
            else:
                db.add(daily_report)
            
            db.commit()
            db.refresh(daily_report)
            
            print(f"[일일 리포트] 생성 완료: {self.report_date.date()}")
            print(f"  분석 시간: {daily_report.total_hours_analyzed:.1f}시간")
            print(f"  평균 안전 점수: {daily_report.average_safety_score:.0f}")
            print(f"  총 사건 수: {daily_report.total_incidents}")
            
            return daily_report
            
        except Exception as e:
            import traceback
            print(f"[일일 리포트] 오류: {e}")
            print(traceback.format_exc())
            db.rollback()
            return None
        finally:
            db.close()
    
    def _aggregate_safety(self, segments: List[SegmentAnalysis], events: List[RealtimeEvent]) -> Dict:
        """안전 분석 집계"""
        danger_events = [e for e in events if e.severity == 'danger']
        warning_events = [e for e in events if e.severity == 'warning']
        
        # 5분 단위 분석에서 사건 추출
        all_incidents = []
        for segment in segments:
            result = segment.analysis_result or {}
            safety = result.get('safety_analysis', {})
            incidents = safety.get('incident_events', [])
            
            for incident in incidents:
                all_incidents.append({
                    "time": segment.segment_start.isoformat(),
                    "title": incident.get('title', '사건 발생'),
                    "description": incident.get('description', ''),
                    "severity": incident.get('severity', 'warning'),
                    "location": incident.get('location', '알 수 없음')
                })
        
        return {
            "average_safety_score": sum(s.safety_score for s in segments if s.safety_score) / len(segments) if segments else 100,
            "total_incidents": sum(s.incident_count for s in segments if s.incident_count),
            "danger_events_count": len(danger_events),
            "warning_events_count": len(warning_events),
            "realtime_danger_events": [
                {
                    "time": e.timestamp.isoformat(),
                    "title": e.title,
                    "description": e.description,
                    "location": e.location
                }
                for e in danger_events[:10]  # 최대 10개
            ],
            "segment_incidents": all_incidents[:20]  # 최대 20개
        }
    
    def _aggregate_development(self, segments: List[SegmentAnalysis]) -> Dict:
        """발달 분석 집계"""
        dev_observations = []
        
        for segment in segments:
            result = segment.analysis_result or {}
            dev_analysis = result.get('developmental_analysis', {})
            
            # notable_observations 추출
            notable = dev_analysis.get('notable_observations', [])
            if notable:
                for obs in notable:
                    dev_observations.append({
                        "time": segment.segment_start.isoformat(),
                        "observation": obs
                    })
        
        return {
            "total_observations": len(dev_observations),
            "observations": dev_observations[:30]  # 최대 30개
        }
    
    def _create_hourly_summary(self, segments: List[SegmentAnalysis]) -> Dict:
        """시간대별 요약"""
        hourly = {}
        
        for segment in segments:
            hour = segment.segment_start.hour
            if hour not in hourly:
                hourly[hour] = {
                    "hour": hour,
                    "segments_count": 0,
                    "average_safety_score": 0,
                    "total_incidents": 0,
                    "safety_scores": []
                }
            
            hourly[hour]["segments_count"] += 1
            hourly[hour]["total_incidents"] += segment.incident_count if segment.incident_count else 0
            if segment.safety_score:
                hourly[hour]["safety_scores"].append(segment.safety_score)
        
        # 평균 계산
        for hour_data in hourly.values():
            scores = hour_data["safety_scores"]
            hour_data["average_safety_score"] = sum(scores) / len(scores) if scores else 100
            del hour_data["safety_scores"]
        
        return {"hours": list(hourly.values())}
    
    def _create_timeline(self, events: List[RealtimeEvent], segments: List[SegmentAnalysis]) -> Dict:
        """타임라인 이벤트"""
        timeline = []
        
        # 실시간 이벤트 (중요한 것만)
        for event in events:
            if event.severity in ['danger', 'warning']:
                timeline.append({
                    "time": event.timestamp.isoformat(),
                    "type": "realtime_event",
                    "severity": event.severity,
                    "title": event.title,
                    "description": event.description,
                    "location": event.location
                })
        
        # 5분 단위 분석 결과 (주요 이벤트만)
        for segment in segments:
            if segment.incident_count and segment.incident_count > 0:
                result = segment.analysis_result or {}
                safety = result.get('safety_analysis', {})
                
                for incident in safety.get('incident_events', [])[:2]:  # 최대 2개
                    timeline.append({
                        "time": segment.segment_start.isoformat(),
                        "type": "segment_incident",
                        "severity": incident.get('severity', 'warning'),
                        "title": incident.get('title', '사건 발생'),
                        "description": incident.get('description', ''),
                        "location": incident.get('location', '알 수 없음')
                    })
        
        # 시간순 정렬
        timeline.sort(key=lambda x: x['time'])
        
        return {"events": timeline[:100]}  # 최대 100개


# 스케줄러: 매일 자정에 전날 리포트 생성
async def schedule_daily_reports():
    """매일 자정에 전날 리포트 자동 생성"""
    import asyncio
    
    while True:
        now = datetime.now()
        
        # 다음 자정 + 5분 계산
        tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=5, second=0, microsecond=0)
        wait_seconds = (tomorrow - now).total_seconds()
        
        print(f"[일일 리포트 스케줄러] 다음 실행: {tomorrow} ({wait_seconds/3600:.1f}시간 후)")
        await asyncio.sleep(wait_seconds)
        
        # 전날 리포트 생성
        yesterday = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 모든 카메라에 대해 리포트 생성
        # TODO: DB에서 활성 카메라 목록 조회
        cameras = ["camera-1"]
        
        for camera_id in cameras:
            try:
                generator = DailyReportGenerator(camera_id, yesterday)
                await generator.generate_report()
            except Exception as e:
                print(f"[일일 리포트 스케줄러] 오류 ({camera_id}): {e}")

