"""실시간 이벤트 탐지기 (OpenCV 기반)"""

import cv2
import numpy as np
from datetime import datetime
from typing import Optional, List, Dict, Tuple
from pathlib import Path

from app.models.live_monitoring.models import RealtimeEvent
from app.database.session import get_db


class RealtimeEventDetector:
    """
    실시간 이벤트 탐지 (경량)
    - 움직임 감지
    - 위험 구역 진입 감지
    - 간단한 행동 분류
    """
    
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.prev_frame = None
        self.motion_threshold = 30  # 움직임 감지 임계값
        self.min_contour_area = 500  # 최소 윤곽 면적
        
        # 위험 구역 정의 (화면 좌표 비율, 0.0~1.0)
        self.danger_zones = [
            {"name": "주방", "coords": [(0.7, 0.0), (1.0, 0.5)], "severity": "danger"},
            {"name": "계단", "coords": [(0.0, 0.7), (0.3, 1.0)], "severity": "danger"},
        ]
        
        # 이벤트 중복 방지 (같은 이벤트 연속 발생 방지)
        self.last_event_time: Dict[str, datetime] = {}
        self.event_cooldown = 10  # 초
        
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
    
    def process_frame(self, frame: np.ndarray) -> List[RealtimeEvent]:
        """
        프레임 처리 및 이벤트 생성
        
        Returns:
            생성된 이벤트 리스트
        """
        events = []
        
        # 1. 움직임 감지
        motion_detected, motion_intensity, bbox = self.detect_motion(frame)
        
        if not motion_detected:
            return events
        
        # 2. 위험 구역 확인
        if bbox:
            danger_zone = self.check_danger_zone(bbox, frame.shape[:2])
            
            if danger_zone:
                event_key = f"danger_zone_{danger_zone['name']}"
                
                if self.should_create_event(event_key):
                    event = RealtimeEvent(
                        camera_id=self.camera_id,
                        timestamp=datetime.now(),
                        event_type='safety',
                        severity=danger_zone['severity'],
                        title=f"{danger_zone['name']} 접근 감지",
                        description=f"아이가 {danger_zone['name']} 근처에 접근했습니다.",
                        location=danger_zone['name'],
                        event_metadata={
                            'zone': danger_zone['name'],
                            'bbox': bbox,
                            'motion_intensity': motion_intensity
                        }
                    )
                    events.append(event)
                    self.last_event_time[event_key] = datetime.now()
        
        # 3. 활동 분류
        activity = self.classify_activity(motion_intensity, bbox)
        
        if activity == 'active':
            event_key = "high_activity"
            
            if self.should_create_event(event_key):
                event = RealtimeEvent(
                    camera_id=self.camera_id,
                    timestamp=datetime.now(),
                    event_type='development',
                    severity='info',
                    title="활발한 활동 감지",
                    description="아이가 활발하게 움직이고 있습니다.",
                    location="거실",
                    event_metadata={
                        'activity': activity,
                        'motion_intensity': motion_intensity,
                        'bbox': bbox
                    }
                )
                events.append(event)
                self.last_event_time[event_key] = datetime.now()
        
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

