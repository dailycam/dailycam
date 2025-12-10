"""하이라이트 클립 생성 서비스 - FFmpeg 기반 실제 영상 자르기"""

import subprocess
import os
import uuid
import shutil
import platform
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from sqlalchemy.orm import Session

from app.models.clip import HighlightClip, ClipCategory
from app.models.live_monitoring.models import SegmentAnalysis
from app.services.s3_service import S3Service


class HighlightClipService:
    """FFmpeg를 이용한 하이라이트 클립 생성 서비스"""
    
    def __init__(self, camera_id: str = "camera-1"):
        self.camera_id = camera_id
        
        # 절대 경로 계산
        current_file = Path(__file__).resolve()
        self.backend_dir = current_file.parents[2]
        
        # 원본 영상 디렉토리
        self.source_dir = self.backend_dir / "temp_videos" / "hls_buffer" / camera_id / "archive"
        
        # 하이라이트 저장 디렉토리
        self.highlights_dir = self.backend_dir / "videos" / "highlights"
        self.highlights_dir.mkdir(parents=True, exist_ok=True)
        
        # 썸네일 디렉토리
        self.thumbnails_dir = self.highlights_dir / "thumbnails"
        self.thumbnails_dir.mkdir(parents=True, exist_ok=True)
        
        # FFmpeg 경로 찾기
        self.ffmpeg_path = "ffmpeg"
        self._find_ffmpeg()

    def _find_ffmpeg(self):
        """FFmpeg 실행 파일 경로 찾기"""
        ffmpeg_path = None
        
        # Docker 환경
        if os.path.exists('/.dockerenv') or os.getenv('DOCKER_CONTAINER') == 'true':
            ffmpeg_path = shutil.which('ffmpeg')
        
        # 프로젝트 내부 bin (Windows)
        if not ffmpeg_path and platform.system() == 'Windows':
            local_ffmpeg = self.backend_dir / "bin" / "ffmpeg.exe"
            if local_ffmpeg.exists():
                ffmpeg_path = str(local_ffmpeg)
        
        # PATH 환경변수
        if not ffmpeg_path:
            ffmpeg_path = shutil.which('ffmpeg')
        
        if ffmpeg_path:
            self.ffmpeg_path = ffmpeg_path
    
    def create_highlight_clip(
        self,
        source_video_path: str,
        start_time: float,
        duration: float,
        title: str,
        description: str = "",
        category: str = "safety",
        sub_category: str = "",
        db: Session = None
    ) -> Optional[Dict]:
        """원본 영상에서 하이라이트 클립 생성"""
        # 원본 파일 존재 확인
        source_path = Path(source_video_path)
        if not source_path.exists():
            print(f"[하이라이트] ❌ 원본 파일 없음: {source_video_path}")
            return None
        
        # 고유한 파일명 생성
        unique_id = uuid.uuid4().hex[:12]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"highlight_{category}_{timestamp}_{unique_id}.mp4"
        output_path = self.highlights_dir / filename
        
        # FFmpeg로 영상 자르기
        success = self._extract_clip_ffmpeg(
            source_path=source_path,
            output_path=output_path,
            start_time=start_time,
            duration=duration
        )
        
        if not success:
            return None
        
        # 썸네일 생성
        thumbnail_filename = filename.replace('.mp4', '.jpg')
        thumbnail_path = self.thumbnails_dir / thumbnail_filename
        
        self._generate_thumbnail_ffmpeg(
            video_path=output_path,
            thumbnail_path=thumbnail_path,
            timestamp=duration / 2
        )
        
        # DB에 클립 정보 저장
        if db:
            # 중복 체크
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
                sub_category=sub_category,
                importance="high",
                duration_seconds=int(duration),
            )
            
            db.add(clip)
            db.commit()
            db.refresh(clip)
            
            # S3에 업로드 (활성화된 경우)
            s3_service = S3Service()
            if s3_service.is_enabled():
                try:
                    # 비디오 업로드
                    video_s3_url = s3_service.upload_clip(
                        file_path=output_path,
                        clip_id=str(clip.id),
                        file_type="video"
                    )
                    
                    # 썸네일 업로드
                    thumbnail_s3_url = None
                    if thumbnail_path.exists():
                        thumbnail_s3_url = s3_service.upload_clip(
                            file_path=thumbnail_path,
                            clip_id=str(clip.id),
                            file_type="thumbnail"
                        )
                    
                    # DB에 S3 URL 업데이트
                    if video_s3_url:
                        clip.video_url = video_s3_url
                        if thumbnail_s3_url:
                            clip.thumbnail_url = thumbnail_s3_url
                        db.commit()
                        db.refresh(clip)
                        
                        # 로컬 파일 삭제 (선택적 - S3 업로드 성공 후)
                        try:
                            output_path.unlink()
                            print(f"[하이라이트] 🗑️ 로컬 파일 삭제: {output_path.name}")
                        except Exception as e:
                            print(f"[하이라이트] ⚠️ 로컬 파일 삭제 실패 (무시): {e}")
                        
                        if thumbnail_path.exists():
                            try:
                                thumbnail_path.unlink()
                                print(f"[하이라이트] 🗑️ 로컬 썸네일 삭제: {thumbnail_path.name}")
                            except Exception as e:
                                print(f"[하이라이트] ⚠️ 로컬 썸네일 삭제 실패 (무시): {e}")
                    else:
                        print(f"[하이라이트] ⚠️ S3 업로드 실패, 로컬 URL 유지")
                except Exception as e:
                    print(f"[하이라이트] ⚠️ S3 업로드 중 오류 발생 (로컬 URL 유지): {e}")
            
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
        """FFmpeg로 영상 클립 추출"""
        try:
            command = [
                str(self.ffmpeg_path),
                "-y",
                "-ss", str(start_time),
                "-i", str(source_path),
                "-t", str(duration),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                str(output_path)
            ]
            
            print(f"[하이라이트] 🎬 클립 생성 중: {output_path.name}")
            
            result = subprocess.run(
                command,
                check=True,
                stderr=subprocess.PIPE,
                stdout=subprocess.PIPE,
                timeout=120
            )
            
            if output_path.exists():
                file_size_mb = output_path.stat().st_size / (1024 * 1024)
                print(f"[하이라이트] ✅ 클립 생성 완료: {output_path.name} ({file_size_mb:.2f} MB)")
                return True
            else:
                print(f"[하이라이트] ❌ 출력 파일 생성 실패")
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
        """영상에서 썸네일 생성"""
        try:
            command = [
                str(self.ffmpeg_path),
                "-y",
                "-ss", str(timestamp),
                "-i", str(video_path),
                "-vframes", "1",
                "-q:v", "2",
                "-vf", "scale=640:-1",
                str(thumbnail_path)
            ]
            
            result = subprocess.run(
                command,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=30
            )
            
            if result.returncode == 0 and thumbnail_path.exists():
                print(f"[하이라이트] ✅ 썸네일 생성: {thumbnail_path.name}")
                return True
            else:
                return False
                
        except Exception as e:
            print(f"[하이라이트] ⚠️  썸네일 생성 오류: {e}")
            return False
    
    def create_clips_from_segment_analysis(
        self,
        segment_analysis: SegmentAnalysis,
        db: Session
    ) -> list:
        """세그먼트 분석 결과에서 하이라이트 클립 자동 생성"""
        clips_created = []
        
        # 원본 영상 파일 찾기 (UTC -> KST 변환)
        segment_start_utc = segment_analysis.segment_start
        if segment_start_utc.tzinfo is None:
            segment_start_utc = segment_start_utc.replace(tzinfo=timezone.utc)
        
        kst = timezone(timedelta(hours=9))
        segment_start_kst = segment_start_utc.astimezone(kst)
        
        archive_filename = f"archive_{segment_start_kst.strftime('%Y%m%d_%H%M%S')}.mp4"
        source_video = self.source_dir / archive_filename
        
        # 로컬 파일이 없으면 S3에서 다운로드 시도
        if not source_video.exists():
            from app.services.s3_service import S3Service
            s3_service = S3Service()
            
            if s3_service.is_enabled():
                # S3 키 생성 (upload_archive와 동일한 형식)
                s3_key = f"archives/{self.camera_id}/{segment_start_kst.strftime('%Y/%m/%d')}/{archive_filename}"
                
                print(f"[하이라이트] 📥 로컬 파일 없음, S3에서 다운로드 시도: {s3_key}")
                
                # 로컬 디렉토리 생성
                self.source_dir.mkdir(parents=True, exist_ok=True)
                
                # S3에서 다운로드
                success = s3_service.download_archive(
                    s3_key=s3_key,
                    local_path=source_video
                )
                
                if not success:
                    # 패턴 검색으로 대체 시도
                    pattern = f"archive_{segment_start_kst.strftime('%Y%m%d_%H%M')}*.mp4"
                    matches = list(self.source_dir.glob(pattern))
                    if matches:
                        source_video = matches[0]
                        print(f"[하이라이트] 🔍 패턴 매칭 파일 사용: {source_video.name}")
                    else:
                        print(f"[하이라이트] ❌ 원본 영상을 찾을 수 없습니다: {archive_filename}")
                        return clips_created
            else:
                # S3 비활성화 시 패턴 검색으로 대체
                pattern = f"archive_{segment_start_kst.strftime('%Y%m%d_%H%M')}*.mp4"
                matches = list(self.source_dir.glob(pattern))
                if matches:
                    source_video = matches[0]
                else:
                    print(f"[하이라이트] ❌ 원본 영상을 찾을 수 없습니다: {archive_filename}")
                    return clips_created
        
        print(f"[하이라이트] 🔍 원본 영상 검색: {source_video.name}")
        print(f"[하이라이트] 📁 검색 경로: {self.source_dir}")
        
        # 안전 이벤트 필터링 (위험, 사고만)
        safety_events = []
        if segment_analysis.safety_incidents:
            for event in segment_analysis.safety_incidents:
                severity = event.get('severity', '').lower()
                if severity in ['위험', '사고', 'danger', 'accident']:
                    timestamp_range = event.get('timestamp_range', '00:00:00-00:00:00')
                    try:
                        start_time_str = timestamp_range.split('-')[0]
                        h, m, s = start_time_str.split(':')
                        absolute_timestamp = int(h) * 3600 + int(m) * 60 + int(s)
                        
                        # VLM이 전체 영상 기준으로 생성한 timestamp를 10분 세그먼트 기준으로 변환
                        # 예: 18분(1080초) → 10분 세그먼트 내에서는 0초 (1080 % 600 = 480초)
                        segment_duration = 600  # 10분
                        timestamp_offset = absolute_timestamp % segment_duration
                        
                        print(f"[하이라이트] 🔍 안전 이벤트 파싱: {event.get('title', 'N/A')}")
                        print(f"  - 원본 timestamp_range: {timestamp_range}")
                        print(f"  - 절대 시간: {absolute_timestamp}초")
                        print(f"  - 세그먼트 내 offset: {timestamp_offset}초")
                        
                        safety_events.append({
                            'type': 'safety',
                            'title': event.get('title', '안전 위험'),
                            'description': event.get('description', ''),
                            'timestamp_offset': timestamp_offset,
                            'severity': severity
                        })
                    except Exception as e:
                        print(f"[하이라이트] ⚠️ 타임스탬프 파싱 실패: {timestamp_range}, 에러: {e}")
                        continue
        
        # 발달 이벤트 필터링 (최초발생, 다음단계징후만)
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
        
        # 병합 및 정렬
        all_events = safety_events + development_events
        all_events.sort(key=lambda x: x['timestamp_offset'])
        
        if not all_events:
            print(f"[하이라이트] ℹ️  생성할 이벤트 없음 (필터링 조건 미충족)")
            return clips_created
        
        # 이벤트 병합 (15초 이내)
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
                if event['timestamp_offset'] - current_group['end_offset'] <= 15:
                    current_group['events'].append(event)
                    current_group['end_offset'] = event['timestamp_offset']
                else:
                    merged_events.append(current_group)
                    current_group = {
                        'events': [event],
                        'start_offset': event['timestamp_offset'],
                        'end_offset': event['timestamp_offset']
                    }
        
        if current_group:
            merged_events.append(current_group)
        
        # 클립 생성
        for group in merged_events:
            center = (group['start_offset'] + group['end_offset']) / 2
            span = group['end_offset'] - group['start_offset']
            
            # 클립 길이 결정 (12~30초)
            if span <= 5:
                duration = 12
            elif span <= 15:
                duration = min(20, span + 10)
            else:
                duration = min(30, span + 10)
            
            start_time = max(0, center - duration / 2)
            
            # 제목 및 설명 생성
            if len(group['events']) == 1:
                event = group['events'][0]
                title = event['title']
                description = event['description']
                category = event['type']
                
                if event['type'] == 'safety':
                    severity = event.get('severity', '위험')
                    sub_category = f"🚨 {severity.upper()} 등급 안전 이벤트가 감지되었습니다"
                    if not title.startswith('['): title = f"[안전] {title}"
                else:
                    if '최초' in title: sub_category = "🎉 아이의 새로운 발달 행동이 처음 관찰되었습니다"
                    else: sub_category = "📈 다음 발달 단계로 나아가는 징후가 보입니다"
                    if not title.startswith('['): title = f"[발달] {title}"
            else:
                titles = [e['title'] for e in group['events']]
                descriptions = [e['description'] for e in group['events'] if e.get('description')]
                category = group['events'][0]['type']
                
                safety_count = sum(1 for e in group['events'] if e['type'] == 'safety')
                dev_count = len(group['events']) - safety_count
                
                if safety_count > 0 and dev_count > 0:
                    sub_category = f"⚠️ 안전 이벤트 {safety_count}건과 발달 이벤트 {dev_count}건이 동시에 발생했습니다"
                    title = f"[복합] 이벤트 ({len(group['events'])}건)"
                elif safety_count > 1:
                    sub_category = f"🚨 {safety_count}건의 안전 이벤트가 짧은 시간 내 연속 발생했습니다"
                    title = f"[안전] 복합 이벤트 ({safety_count}건)"
                else:
                    sub_category = f"📈 {dev_count}건의 중요한 발달 행동이 연속 관찰되었습니다"
                    title = f"[발달] 복합 이벤트 ({dev_count}건)"
                
                description = " / ".join(descriptions[:3]) if descriptions else " / ".join(titles[:3])
            
            print(f"[하이라이트] 📹 클립 생성: {title} ({duration}초)")
            print(f"[하이라이트] 🕐 타임스탬프 정보:")
            print(f"  - 이벤트 시작 오프셋: {group['start_offset']}초")
            print(f"  - 이벤트 종료 오프셋: {group['end_offset']}초")
            print(f"  - 클립 시작 시간: {start_time}초")
            print(f"  - 클립 길이: {duration}초")
            print(f"  - 원본 파일: {source_video.name}")
            
            result = self.create_highlight_clip(
                source_video_path=str(source_video),
                start_time=start_time,
                duration=duration,
                title=title,
                description=description,
                category=category,
                sub_category=sub_category,
                db=db
            )
            
            if result:
                clips_created.append(result)
        
        return clips_created
