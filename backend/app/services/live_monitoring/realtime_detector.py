"""실시간 이벤트 탐지기 (하이브리드: OpenCV + Gemini)"""

import cv2
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Tuple
from pathlib import Path
import asyncio

from app.models.live_monitoring.models import RealtimeEvent
from app.database.session import get_db
from app.services.gemini_service import GeminiService


class RealtimeEventDetector:
    """
    실시간 이벤트 탐지 (하이브리드)
    - 경량 탐지: 움직임 감지, 위험 구역 진입 (즉시)
    - Gemini 분석: 30초~1분마다 상세 분석 (높은 정확도)
    """
    
    def __init__(self, camera_id: str, age_months: Optional[int] = None):
        self.camera_id = camera_id
        self.age_months = age_months
        self.prev_frame = None
        # OpenCV 경량 탐지 비활성화 (Gemini만 사용)
        # 이유: 하드코딩된 위험 구역이 부정확하고, Gemini가 더 정확함
        self.enable_opencv_detection = False
        
        self.motion_threshold = 30  # 움직임 감지 임계값 (사용 안 함)
        self.min_contour_area = 500  # 최소 윤곽 면적 (사용 안 함)
        
        # 위험 구역 정의 - 비활성화됨
        self.danger_zones = []
        
        # 이벤트 중복 방지 (같은 이벤트 연속 발생 방지)
        self.last_event_time: Dict[str, datetime] = {}
        self.event_cooldown = 10  # 초
        
        # Gemini 분석 관련
        self.gemini_service = GeminiService()
        self.last_gemini_analysis: Optional[datetime] = None
        self.gemini_analysis_interval = 45  # 45초마다 Gemini 분석 (1분 내외)
        self.gemini_analysis_running = False
        self.last_analyzed_frame: Optional[np.ndarray] = None
        
    def detect_motion(self, frame: np.ndarray) -> Tuple[bool, float, Optional[Tuple[int, int, int, int]]]:
        """
        움직임 감지
        
        Returns:
            (움직임 감지 여부, 움직임 강도, 바운딩 박스)
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)
        
        if self.prev_frame is None:
            self.prev_frame = gray
            return False, 0.0, None
        
        # 프레임 차이 계산
        frame_diff = cv2.absdiff(self.prev_frame, gray)
        thresh = cv2.threshold(frame_diff, self.motion_threshold, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)
        
        # 윤곽 찾기
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        self.prev_frame = gray
        
        if not contours:
            return False, 0.0, None
        
        # 가장 큰 윤곽 찾기
        largest_contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest_contour)
        
        if area < self.min_contour_area:
            return False, 0.0, None
        
        # 바운딩 박스
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # 움직임 강도 (0.0 ~ 1.0)
        frame_area = frame.shape[0] * frame.shape[1]
        motion_intensity = min(area / frame_area * 10, 1.0)
        
        return True, motion_intensity, (x, y, w, h)
    
    def check_danger_zone(self, bbox: Tuple[int, int, int, int], frame_shape: Tuple[int, int]) -> Optional[Dict]:
        """
        위험 구역 진입 확인
        
        Args:
            bbox: (x, y, w, h)
            frame_shape: (height, width)
        
        Returns:
            위험 구역 정보 또는 None
        """
        x, y, w, h = bbox
        height, width = frame_shape
        
        # 바운딩 박스 중심점 (비율)
        center_x = (x + w / 2) / width
        center_y = (y + h / 2) / height
        
        for zone in self.danger_zones:
            (x1, y1), (x2, y2) = zone["coords"]
            if x1 <= center_x <= x2 and y1 <= center_y <= y2:
                return zone
        
        return None
    
    def classify_activity(self, motion_intensity: float, bbox: Optional[Tuple[int, int, int, int]]) -> str:
        """
        간단한 활동 분류
        
        Returns:
            'active' | 'moderate' | 'calm'
        """
        if motion_intensity > 0.5:
            return 'active'
        elif motion_intensity > 0.2:
            return 'moderate'
        else:
            return 'calm'
    
    def should_create_event(self, event_key: str) -> bool:
        """
        이벤트 생성 여부 확인 (중복 방지)
        """
        if event_key not in self.last_event_time:
            return True
        
        elapsed = (datetime.now() - self.last_event_time[event_key]).total_seconds()
        return elapsed > self.event_cooldown
    
    def should_run_gemini_analysis(self) -> bool:
        """Gemini 분석을 실행해야 하는지 확인"""
        if self.gemini_analysis_running:
            return False
        
        if self.last_gemini_analysis is None:
            return True
        
        elapsed = (datetime.now() - self.last_gemini_analysis).total_seconds()
        return elapsed >= self.gemini_analysis_interval
    
    async def analyze_with_gemini(self, frame: np.ndarray) -> Optional[RealtimeEvent]:
        """
        Gemini로 프레임 분석 (비동기)
        
        Returns:
            생성된 이벤트 또는 None
        """
        try:
            self.gemini_analysis_running = True
            self.last_gemini_analysis = datetime.now()
            
            # 프레임을 JPEG로 인코딩
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not ret:
                print("[Gemini 분석] 프레임 인코딩 실패")
                return None
            
            frame_bytes = buffer.tobytes()
            
            # Gemini 분석 호출
            print(f"[Gemini 분석] 시작...")
            result = await self.gemini_service.analyze_realtime_snapshot(
                frame_or_video=frame_bytes,
                content_type="image/jpeg",
                age_months=self.age_months
            )
            
            # 결과를 RealtimeEvent로 변환
            event_summary = result.get('event_summary', {})
            safety_status = result.get('safety_status', {})
            current_activity = result.get('current_activity', {})
            dev_obs = result.get('developmental_observation', {})
            
            # severity 매핑
            severity_map = {
                'danger': 'danger',
                'warning': 'warning',
                'safe': 'safe',
                'info': 'info'
            }
            severity = severity_map.get(event_summary.get('severity', 'info'), 'info')
            
            # event_type 결정
            event_type = 'safety' if severity in ['danger', 'warning'] else 'development'
            if dev_obs.get('notable'):
                event_type = 'development'
            
            event = RealtimeEvent(
                camera_id=self.camera_id,
                timestamp=datetime.now(),
                event_type=event_type,
                severity=severity,
                title=event_summary.get('title', '활동 감지'),
                description=event_summary.get('description', ''),
                location=current_activity.get('location', '알 수 없음'),
                event_metadata={
                    'gemini_analysis': True,
                    'current_activity': current_activity,
                    'safety_status': safety_status,
                    'developmental_observation': dev_obs,
                    'action_needed': event_summary.get('action_needed')
                }
            )
            
            print(f"[Gemini 분석] 완료: {event.title} (severity: {severity})")
            return event
            
        except Exception as e:
            print(f"[Gemini 분석] 오류: {e}")
            return None
        finally:
            self.gemini_analysis_running = False
    
    def process_frame(self, frame: np.ndarray) -> List[RealtimeEvent]:
        """
        프레임 처리 및 이벤트 생성 (동기 버전)
        
        OpenCV 경량 탐지는 비활성화됨 - Gemini만 사용
        
        Returns:
            생성된 이벤트 리스트 (항상 빈 리스트)
        """
        events = []
        
        # 프레임 저장 (Gemini 분석용)
        self.last_analyzed_frame = frame.copy()
        
        # OpenCV 경량 탐지 비활성화
        # 이유: 하드코딩된 위험 구역이 부정확하고, Gemini가 더 정확함
        if not self.enable_opencv_detection:
            return events
        
        # 아래 코드는 실행되지 않음 (enable_opencv_detection = False)
        # 1. 움직임 감지 (경량, 즉시)
        motion_detected, motion_intensity, bbox = self.detect_motion(frame)
        
        if not motion_detected:
            return events
        
        # 2. 위험 구역 확인 (경량, 즉시)
        if bbox:
            danger_zone = self.check_danger_zone(bbox, frame.shape[:2])
            
            if danger_zone:
                event_key = f"danger_zone_{danger_zone['name']}"
                
                if self.should_create_event(event_key):
                    # 위험 이벤트는 즉시 생성 (경량)
                    event = RealtimeEvent(
                        camera_id=self.camera_id,
                        timestamp=datetime.now(),
                        event_type='safety',
                        severity=danger_zone['severity'],
                        title=f"⚠️ {danger_zone['name']} 접근 감지",
                        description=f"아이가 {danger_zone['name']} 근처에 접근했습니다. 주의가 필요합니다.",
                        location=danger_zone['name'],
                        event_metadata={
                            'zone': danger_zone['name'],
                            'bbox': bbox,
                            'motion_intensity': motion_intensity,
                            'lightweight_detection': True
                        }
                    )
                    events.append(event)
                    self.last_event_time[event_key] = datetime.now()
        
        return events
    
    async def process_frame_async(self, frame: np.ndarray) -> List[RealtimeEvent]:
        """
        프레임 처리 및 이벤트 생성 (비동기 버전, Gemini 분석 포함)
        
        Returns:
            생성된 이벤트 리스트
        """
        events = []
        
        # 1. 경량 탐지 (즉시)
        lightweight_events = self.process_frame(frame)
        events.extend(lightweight_events)
        
        # 2. Gemini 분석 (45초마다)
        if self.should_run_gemini_analysis():
            gemini_event = await self.analyze_with_gemini(frame)
            if gemini_event:
                events.append(gemini_event)
        
        return events
    
    def save_events(self, events: List[RealtimeEvent]):
        """
        이벤트를 데이터베이스에 저장
        """
        if not events:
            return
        
        db = next(get_db())
        try:
            for event in events:
                db.add(event)
            db.commit()
            print(f"[실시간 탐지] {len(events)}개 이벤트 저장됨")
        except Exception as e:
            print(f"[실시간 탐지] 이벤트 저장 실패: {e}")
            db.rollback()
        finally:
            db.close()

