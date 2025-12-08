"""하이라이트 클립 생성 서비스 - FFmpeg 기반 실제 영상 자르기"""

import subprocess
import os
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict
from sqlalchemy.orm import Session

from app.models.clip import HighlightClip, ClipCategory
from app.models.live_monitoring.models import SegmentAnalysis


class HighlightClipService:
    """
    FFmpeg를 이용한 하이라이트 클립 생성 서비스
    
    - 원본 영상에서 특정 구간을 물리적으로 잘라서 .mp4 파일로 저장
    - 썸네일 자동 생성
    - 다운로드 가능한 URL 제공
    """
    
    def __init__(self, camera_id: str = "camera-1"):
        self.camera_id = camera_id
        
        # 원본 영상 디렉토리 (HLS 아카이브)
        self.source_dir = Path(f"temp_videos/hls_buffer/{camera_id}/archive")
        
        # 하이라이트 저장 디렉토리
        self.highlights_dir = Path("videos/highlights")
        self.highlights_dir.mkdir(parents=True, exist_ok=True)
        
        # 썸네일 디렉토리
        self.thumbnails_dir = self.highlights_dir / "thumbnails"
        self.thumbnails_dir.mkdir(parents=True, exist_ok=True)
    
    def create_highlight_clip(
        self,
        source_video_path: str,
        start_time: float,
        duration: float,
        title: str,
        description: str = "",
        category: str = "safety",
        sub_category: str = "",  # 선정 이유
        db: Session = None
    ) -> Optional[Dict]:
        """
        원본 영상에서 하이라이트 클립 생성
        
        Args:
            source_video_path: 원본 비디오 파일 경로 (예: temp_videos/hls_buffer/camera-1/archive/segment_01.mp4)
            start_time: 자르기 시작할 초 (예: 10.5)
            duration: 클립 길이 (초) (예: 30)
            title: 클립 제목
            description: 클립 설명
            category: 카테고리 (safety, development)
            sub_category: 하위 카테고리 (선정 이유)
            db: 데이터베이스 세션
            
        Returns:
            {
                "clip_id": 1,
                "video_url": "/videos/highlights/highlight_abc123.mp4",
                "thumbnail_url": "/videos/highlights/thumbnails/highlight_abc123.jpg",
                "download_url": "/api/clips/download/1",
                "duration": 30
            }
        """
        # 1. 원본 파일 존재 확인
        source_path = Path(source_video_path)
        if not source_path.exists():
            print(f"[하이라이트] ❌ 원본 파일 없음: {source_video_path}")
            return None
        
        # 2. 고유한 파일명 생성
        unique_id = uuid.uuid4().hex[:12]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"highlight_{category}_{timestamp}_{unique_id}.mp4"
        output_path = self.highlights_dir / filename
        
        # 3. FFmpeg로 영상 자르기 (재인코딩 없이 고속 복사)
        success = self._extract_clip_ffmpeg(
            source_path=source_path,
            output_path=output_path,
            start_time=start_time,
            duration=duration
        )
        
        if not success:
            return None
        
        # 4. 썸네일 생성 (클립 중간 프레임)
        thumbnail_filename = filename.replace('.mp4', '.jpg')
        thumbnail_path = self.thumbnails_dir / thumbnail_filename
        
        self._generate_thumbnail_ffmpeg(
            video_path=output_path,
            thumbnail_path=thumbnail_path,
            timestamp=duration / 2  # 중간 프레임
        )
        
        # 5. DB에 클립 정보 저장
        if db:
            # 중복 체크: 같은 제목과 설명을 가진 클립이 최근 5분 이내에 생성되었는지 확인
            from datetime import datetime, timedelta
            five_minutes_ago = datetime.now() - timedelta(minutes=5)
            
            existing_clip = db.query(HighlightClip).filter(
                HighlightClip.title == title,
                HighlightClip.description == description,
                HighlightClip.created_at >= five_minutes_ago
            ).first()
            
            if existing_clip:
                print(f"[하이라이트] ⚠️  중복 클립 감지, 생성 스킵: {title}")
                return {
                    "clip_id": existing_clip.id,
                    "video_url": existing_clip.video_url,
                    "thumbnail_url": existing_clip.thumbnail_url,
                    "download_url": f"/api/clips/download/{existing_clip.id}",
                    "duration": existing_clip.duration_seconds,
                    "duplicate": True
                }
            
            clip = HighlightClip(
                title=title,
                description=description,
                video_url=f"/videos/highlights/{filename}",
                thumbnail_url=f"/videos/highlights/thumbnails/{thumbnail_filename}" if thumbnail_path.exists() else "",
                category=ClipCategory.SAFETY if category == "safety" else ClipCategory.DEVELOPMENT,
                sub_category=sub_category,  # 선정 이유 저장
                importance="high",
                duration_seconds=int(duration),
            )
            
            db.add(clip)
            db.commit()
            db.refresh(clip)
            
            return {
                "clip_id": clip.id,
                "video_url": clip.video_url,
                "thumbnail_url": clip.thumbnail_url,
                "download_url": f"/api/clips/download/{clip.id}",
                "duration": clip.duration_seconds
            }
        
        return {
            "video_url": f"/videos/highlights/{filename}",
            "thumbnail_url": f"/videos/highlights/thumbnails/{thumbnail_filename}",
            "duration": int(duration)
        }
    
    def _extract_clip_ffmpeg(
        self,
        source_path: Path,
        output_path: Path,
        start_time: float,
        duration: float
    ) -> bool:
        """
        FFmpeg로 영상 클립 추출
        
        HLS 세그먼트는 재인코딩 필요 (타임스탬프 문제 방지)
        """
        try:
            command = [
                "ffmpeg",
                "-y",  # 덮어쓰기 허용
                "-ss", str(start_time),  # 시작 시간 (초)
                "-i", str(source_path),  # 입력 파일
                "-t", str(duration),  # 길이 (초)
                "-c:v", "libx264",  # 비디오 코덱 (H.264)
                "-preset", "fast",  # 인코딩 속도 (fast = 빠르고 적당한 품질)
                "-crf", "23",  # 품질 (18-28, 낮을수록 고품질)
                "-c:a", "aac",  # 오디오 코덱
                "-b:a", "128k",  # 오디오 비트레이트
                "-movflags", "+faststart",  # 웹 재생 최적화
                str(output_path)  # 출력 파일
            ]
            
            print(f"[하이라이트] 🎬 클립 생성 중: {output_path.name}")
            print(f"[하이라이트] 📍 구간: {start_time}초 ~ {start_time + duration}초 ({duration}초)")
            
            result = subprocess.run(
                command,
                check=True,
                stderr=subprocess.PIPE,
                stdout=subprocess.PIPE,
                timeout=120,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            
            if output_path.exists():
                file_size_mb = output_path.stat().st_size / (1024 * 1024)
                print(f"[하이라이트] ✅ 클립 생성 완료: {output_path.name} ({file_size_mb:.2f} MB)")
                return True
            else:
                print(f"[하이라이트] ❌ 출력 파일 생성 실패")
                return False
                
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            print(f"[하이라이트] ❌ FFmpeg 오류:")
            print(error_msg)
            return False
        except subprocess.TimeoutExpired:
            print(f"[하이라이트] ❌ FFmpeg 타임아웃 (120초 초과)")
            return False
        except Exception as e:
            print(f"[하이라이트] ❌ 클립 생성 오류: {e}")
            return False
    
    def _generate_thumbnail_ffmpeg(
        self,
        video_path: Path,
        thumbnail_path: Path,
        timestamp: float = 0
    ) -> bool:
        """영상에서 썸네일 생성 (특정 시간의 프레임 추출)"""
        try:
            command = [
                "ffmpeg",
                "-y",
                "-ss", str(timestamp),  # 추출할 시간
                "-i", str(video_path),
                "-vframes", "1",  # 1프레임만 추출
                "-q:v", "2",  # 품질 (1~31, 낮을수록 고품질)
                "-vf", "scale=640:-1",  # 너비 640px로 리사이즈
                str(thumbnail_path)
            ]
            
            result = subprocess.run(
                command,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=30,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            
            if result.returncode == 0 and thumbnail_path.exists():
                print(f"[하이라이트] ✅ 썸네일 생성: {thumbnail_path.name}")
                return True
            else:
                print(f"[하이라이트] ⚠️  썸네일 생성 실패")
                return False
                
        except Exception as e:
            print(f"[하이라이트] ⚠️  썸네일 생성 오류: {e}")
            return False
    
    def create_clips_from_segment_analysis(
        self,
        segment_analysis: SegmentAnalysis,
        db: Session
    ) -> list:
        """
        세그먼트 분석 결과에서 하이라이트 클립 자동 생성
        
        규칙:
        - 안전: '위험', '사고' 등급만
        - 발달: '최초발생' 또는 '다음단계징후' 있는 것만
        - 클립 길이: 10~15초 (기본), 이벤트 겹치면 최대 30초
        - 15초 이내 이벤트는 하나로 병합
        """
        clips_created = []
        
        # 1. 원본 영상 파일 찾기
        # segment_start는 UTC로 저장되어 있으므로 KST로 변환
        from datetime import timezone, timedelta
        
        segment_start_utc = segment_analysis.segment_start
        if segment_start_utc.tzinfo is None:
            # naive datetime인 경우 UTC로 간주
            segment_start_utc = segment_start_utc.replace(tzinfo=timezone.utc)
        
        # KST로 변환 (UTC+9)
        kst = timezone(timedelta(hours=9))
        segment_start_kst = segment_start_utc.astimezone(kst)
        
        archive_filename = f"archive_{segment_start_kst.strftime('%Y%m%d_%H%M%S')}.mp4"
        source_video = self.source_dir / archive_filename
        
        print(f"[하이라이트] 🔍 원본 영상 검색: {archive_filename}")
        print(f"[하이라이트] 📁 검색 경로: {self.source_dir}")
        
        if not source_video.exists():
            pattern = f"archive_{segment_start_kst.strftime('%Y%m%d_%H%M')}*.mp4"
            print(f"[하이라이트] 🔍 패턴 검색: {pattern}")
            matches = list(self.source_dir.glob(pattern))
            if matches:
                source_video = matches[0]
                print(f"[하이라이트] ✅ 패턴 매칭 성공: {source_video.name}")
            else:
                print(f"[하이라이트] ❌ 원본 영상 없음: {archive_filename}")
                print(f"[하이라이트] 📋 디렉토리 내용:")
                for f in sorted(self.source_dir.glob("*.mp4"))[-5:]:
                    print(f"  - {f.name}")
                return clips_created
        
        # 2. 안전 이벤트 필터링 (위험, 사고만)
        # safety_incidents에 safety_events 데이터가 저장됨 (title/description 포함)
        safety_events = []
        if segment_analysis.safety_incidents:
            for event in segment_analysis.safety_incidents:
                severity = event.get('severity', '').lower()
                if severity in ['위험', '사고', 'danger', 'accident']:
                    # timestamp_range를 timestamp_offset으로 변환
                    timestamp_range = event.get('timestamp_range', '00:00:00-00:00:00')
                    start_time_str = timestamp_range.split('-')[0]
                    h, m, s = start_time_str.split(':')
                    timestamp_offset = int(h) * 3600 + int(m) * 60 + int(s)
                    
                    safety_events.append({
                        'type': 'safety',
                        'title': event.get('title', '안전 위험'),
                        'description': event.get('description', ''),
                        'timestamp_offset': timestamp_offset,
                        'severity': severity
                    })
        
        # 3. 발달 이벤트 필터링 (최초발생, 다음단계징후)
        development_events = []
        if segment_analysis.development_milestones:
            for milestone in segment_analysis.development_milestones:
                is_first = milestone.get('최초발생', False) or milestone.get('first_occurrence', False)
                has_next_sign = milestone.get('다음단계징후', False) or milestone.get('next_stage_sign', False)
                
                if is_first or has_next_sign:
                    event_type = "최초 발견" if is_first else "다음 단계 징후"
                    development_events.append({
                        'type': 'development',
                        'title': f"[{event_type}] {milestone.get('name', '발달 행동')}",
                        'description': milestone.get('description', ''),
                        'timestamp_offset': milestone.get('timestamp_offset', 300),
                        'category': milestone.get('category', '발달')
                    })
        
        # 4. 모든 이벤트 병합 및 정렬
        all_events = safety_events + development_events
        all_events.sort(key=lambda x: x['timestamp_offset'])
        
        if not all_events:
            print(f"[하이라이트] ℹ️  생성할 클립 없음 (필터링 후)")
            return clips_created
        
        # 5. 이벤트 병합 (15초 이내는 하나로)
        merged_events = []
        current_group = None
        
        for event in all_events:
            if current_group is None:
                current_group = {
                    'events': [event],
                    'start_offset': event['timestamp_offset'],
                    'end_offset': event['timestamp_offset']
                }
            else:
                # 15초 이내면 병합
                if event['timestamp_offset'] - current_group['end_offset'] <= 15:
                    current_group['events'].append(event)
                    current_group['end_offset'] = event['timestamp_offset']
                else:
                    # 새 그룹 시작
                    merged_events.append(current_group)
                    current_group = {
                        'events': [event],
                        'start_offset': event['timestamp_offset'],
                        'end_offset': event['timestamp_offset']
                    }
        
        if current_group:
            merged_events.append(current_group)
        
        # 6. 각 그룹에 대해 클립 생성
        for group in merged_events:
            # 클립 구간 계산
            center = (group['start_offset'] + group['end_offset']) / 2
            span = group['end_offset'] - group['start_offset']
            
            # 기본 10초, 이벤트 겹치면 늘림 (최대 30초)
            if span <= 5:
                duration = 12  # 단일 이벤트: 12초
            elif span <= 15:
                duration = min(20, span + 10)  # 약간 겹침: 20초
            else:
                duration = min(30, span + 10)  # 많이 겹침: 최대 30초
            
            start_time = max(0, center - duration / 2)
            
            # 제목 생성 (여러 이벤트면 병합)
            if len(group['events']) == 1:
                event = group['events'][0]
                title = event['title']
                description = event['description']
                category = event['type']
                
                # 선정 이유 생성
                if event['type'] == 'safety':
                    severity = event.get('severity', '위험')
                    reason = f"🚨 {severity.upper()} 등급 안전 이벤트가 감지되었습니다"
                    # 제목에 [안전] 태그 추가
                    if not title.startswith('['):
                        title = f"[안전] {title}"
                else:  # development
                    if '최초' in title:
                        reason = "🎉 아이의 새로운 발달 행동이 처음 관찰되었습니다"
                    else:
                        reason = "📈 다음 발달 단계로 나아가는 징후가 보입니다"
                    # 제목에 [발달] 태그 추가
                    if not title.startswith('['):
                        title = f"[발달] {title}"
            else:
                titles = [e['title'] for e in group['events']]
                descriptions = [e['description'] for e in group['events'] if e.get('description')]
                category = group['events'][0]['type']  # 첫 번째 타입 사용
                
                # 복합 이벤트 선정 이유
                safety_count = sum(1 for e in group['events'] if e['type'] == 'safety')
                dev_count = len(group['events']) - safety_count
                
                if safety_count > 0 and dev_count > 0:
                    reason = f"⚠️ 안전 이벤트 {safety_count}건과 발달 이벤트 {dev_count}건이 동시에 발생했습니다"
                    title = f"[복합] 이벤트 ({len(group['events'])}건)"
                elif safety_count > 1:
                    reason = f"🚨 {safety_count}건의 안전 이벤트가 짧은 시간 내 연속 발생했습니다"
                    title = f"[안전] 복합 이벤트 ({safety_count}건)"
                else:
                    reason = f"📈 {dev_count}건의 중요한 발달 행동이 연속 관찰되었습니다"
                    title = f"[발달] 복합 이벤트 ({dev_count}건)"
                
                # description은 실제 설명 사용 (최대 3개)
                description = " / ".join(descriptions[:3]) if descriptions else " / ".join(titles[:3])
            
            # sub_category에 선정 이유 저장
            sub_category = reason
            
            # 클립 생성
            print(f"[하이라이트] 📹 클립 생성: {title} ({duration}초)")
            result = self.create_highlight_clip(
                source_video_path=str(source_video),
                start_time=start_time,
                duration=duration,
                title=title,
                description=description,
                category=category,
                sub_category=sub_category,  # 선정 이유 전달
                db=db
            )
            
            if result:
                clips_created.append(result)
        
        print(f"[하이라이트] ✅ 총 {len(clips_created)}개 클립 생성 완료")
        return clips_created



# 편의 함수
def create_safety_highlight(
    source_video: str,
    start_time: float,
    duration: float,
    title: str,
    description: str = "",
    db: Session = None
) -> Optional[Dict]:
    """안전 하이라이트 클립 생성"""
    service = HighlightClipService()
    return service.create_highlight_clip(
        source_video_path=source_video,
        start_time=start_time,
        duration=duration,
        title=title,
        description=description,
        category="safety",
        db=db
    )


def create_development_highlight(
    source_video: str,
    start_time: float,
    duration: float,
    title: str,
    description: str = "",
    db: Session = None
) -> Optional[Dict]:
    """발달 하이라이트 클립 생성"""
    service = HighlightClipService()
    return service.create_highlight_clip(
        source_video_path=source_video,
        start_time=start_time,
        duration=duration,
        title=title,
        description=description,
        category="development",
        db=db
    )
