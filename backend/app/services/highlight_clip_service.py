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
            print(f"[하이라이트] 📂 디렉토리 존재 여부: {source_path.parent.exists()}")
            if source_path.parent.exists():
                # 디렉토리 내 파일 목록 출력 (디버깅용)
                files = list(source_path.parent.glob("*.mp4"))
                print(f"[하이라이트] 📋 디렉토리 내 MP4 파일 {len(files)}개 발견")
                if files:
                    print(f"[하이라이트] 📋 첫 3개 파일: {[f.name for f in files[:3]]}")
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
            print(f"[하이라이트] ❌ 클립 생성 실패로 인해 None 반환")
            return None
        
        # 파일 생성 확인 (추가 검증)
        if not output_path.exists():
            print(f"[하이라이트] ❌ 클립 파일이 생성되지 않음: {output_path}")
            return None
        
        # 파일 크기 확인 (0바이트 파일 방지)
        file_size = output_path.stat().st_size
        if file_size == 0:
            print(f"[하이라이트] ❌ 클립 파일이 0바이트: {output_path}")
            output_path.unlink()  # 빈 파일 삭제
            return None
        
        print(f"[하이라이트] ✅ 클립 파일 생성 확인: {output_path} ({file_size / (1024 * 1024):.2f} MB)")
        
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
            
            # 파일 존재 재확인 (DB 저장 전)
            if not output_path.exists():
                print(f"[하이라이트] ❌ DB 저장 전 파일 확인 실패: {output_path}")
                return None
            
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
            
            # DB 저장 후 파일 존재 최종 확인
            if not output_path.exists():
                print(f"[하이라이트] ⚠️ DB 저장 후 파일이 사라짐: {output_path}")
                # DB에서 클립 삭제
                db.delete(clip)
                db.commit()
                return None
            
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
                        # S3 업로드 실패 시 로컬 파일 존재 확인
                        if not output_path.exists():
                            print(f"[하이라이트] ❌ S3 업로드 실패 + 로컬 파일도 없음: {output_path}")
                            # DB에서 클립 삭제
                            db.delete(clip)
                            db.commit()
                            return None
                except Exception as e:
                    print(f"[하이라이트] ⚠️ S3 업로드 중 오류 발생 (로컬 URL 유지): {e}")
                    # S3 업로드 중 오류 발생 시 로컬 파일 확인
                    if not output_path.exists():
                        print(f"[하이라이트] ❌ S3 업로드 오류 + 로컬 파일도 없음: {output_path}")
                        # DB에서 클립 삭제
                        db.delete(clip)
                        db.commit()
                        return None
            
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
            
            # 파일 생성 확인 및 검증
            if output_path.exists():
                file_size = output_path.stat().st_size
                file_size_mb = file_size / (1024 * 1024)
                
                # 0바이트 파일 체크
                if file_size == 0:
                    print(f"[하이라이트] ❌ 출력 파일이 0바이트: {output_path.name}")
                    try:
                        output_path.unlink()  # 빈 파일 삭제
                    except:
                        pass
                    return False
                
                # 최소 파일 크기 체크 (100KB 미만이면 실패로 간주)
                min_size_bytes = 100 * 1024  # 100KB
                if file_size < min_size_bytes:
                    print(f"[하이라이트] ❌ 출력 파일이 너무 작음: {output_path.name} ({file_size_mb:.2f} MB, 최소 {min_size_bytes/1024:.0f}KB 필요)")
                    try:
                        output_path.unlink()  # 작은 파일 삭제
                    except:
                        pass
                    return False
                
                print(f"[하이라이트] ✅ 클립 생성 완료: {output_path.name} ({file_size_mb:.2f} MB)")
                return True
            else:
                print(f"[하이라이트] ❌ 출력 파일 생성 실패: {output_path}")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"[하이라이트] ❌ 클립 생성 타임아웃 (120초 초과)")
            return False
        except subprocess.CalledProcessError as e:
            print(f"[하이라이트] ❌ FFmpeg 실행 실패 (exit code: {e.returncode})")
            if e.stderr:
                stderr_text = e.stderr.decode('utf-8', errors='ignore')[:500]
                print(f"[하이라이트] FFmpeg 에러 메시지: {stderr_text}")
            return False
        except Exception as e:
            print(f"[하이라이트] ❌ 클립 생성 오류: {e}")
            import traceback
            traceback.print_exc()
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
        
        print(f"[하이라이트] 🔍 원본 영상 검색: {archive_filename}")
        print(f"[하이라이트] 📂 검색 디렉토리: {self.source_dir} (존재: {self.source_dir.exists()})")
        
        # 로컬 파일이 없으면 여러 경로 시도
        if not source_video.exists():
            print(f"[하이라이트] ⚠️ 기본 경로에 파일 없음: {source_video}")
            
            # 여러 가능한 경로 시도
            possible_dirs = [
                self.source_dir,  # 기본 경로
                self.backend_dir / "temp_videos" / "hls_buffer" / self.camera_id / "archive",
                self.backend_dir / "temp_videos" / "hourly_buffer" / self.camera_id,
                self.backend_dir / "temp_videos" / self.camera_id / "archive",
            ]
            
            for search_dir in possible_dirs:
                if search_dir.exists():
                    found_file = search_dir / archive_filename
                    if found_file.exists():
                        source_video = found_file
                        print(f"[하이라이트] ✅ 파일 발견: {source_video}")
                        break
                    else:
                        # 패턴 검색으로 대체 시도
                        pattern = f"archive_{segment_start_kst.strftime('%Y%m%d_%H%M')}*.mp4"
                        matches = list(search_dir.glob(pattern))
                        if matches:
                            source_video = matches[0]
                            print(f"[하이라이트] ✅ 패턴 매칭 파일 발견: {source_video}")
                            break
        
        # 여전히 없으면 S3에서 다운로드 시도
        if not source_video.exists():
            from app.services.s3_service import S3Service
            s3_service = S3Service()
            
            if s3_service.is_enabled():
                # S3 키 생성 (upload_archive와 동일한 형식)
                s3_key = f"archives/{self.camera_id}/{segment_start_kst.strftime('%Y/%m/%d')}/{archive_filename}"
                
                
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
        
        # 발달 이벤트 필터링
        development_events = []
        if segment_analysis.development_milestones:
            print(f"[하이라이트] 🔍 발달 마일스톤 {len(segment_analysis.development_milestones)}개 발견, 처리 시작")
            priority_candidates = []
            normal_candidates = []
            
            # analysis_result에서 next_stage_signs 추출 (다음 단계 징후 매칭용)
            next_stage_signs_names = set()
            if segment_analysis.analysis_result:
                development_analysis = segment_analysis.analysis_result.get('development_analysis', {})
                next_stage_signs = development_analysis.get('next_stage_signs', [])
                if isinstance(next_stage_signs, list):
                    for sign in next_stage_signs:
                        if isinstance(sign, dict):
                            sign_name = sign.get('name') or sign.get('skill_name') or sign.get('title')
                            if sign_name:
                                next_stage_signs_names.add(sign_name)
                        elif isinstance(sign, str):
                            next_stage_signs_names.add(sign)
            
            
            for milestone in segment_analysis.development_milestones:
                # present가 false이거나 없으면 스킵 (관찰되지 않은 행동은 클립 생성 안 함)
                present = milestone.get('present', False)
                milestone_name = milestone.get('name', '')
                print(f"[하이라이트] 🔍 발달 마일스톤 확인: name={milestone_name}, present={present}, level={milestone.get('level', 'N/A')}")
                if not present:
                    print(f"[하이라이트] ⏭️  발달 마일스톤 스킵 (present=false): {milestone_name}")
                    continue
                
                if not milestone_name:
                    print(f"[하이라이트] ⏭️  발달 마일스톤 스킵 (name 없음)")
                    continue
                
                # 1. 최초발생 체크 (기존 로직)
                is_first = milestone.get('최초발생', False) or milestone.get('first_occurrence', False)
                
                # 2. 다음 단계 징후 체크 (next_stage_signs와 name 매칭)
                has_next_sign = (
                    milestone.get('다음단계징후', False) or 
                    milestone.get('next_stage_sign', False) or
                    (milestone_name in next_stage_signs_names)
                )
                
                # 3. 숙련도가 높은 경우도 우선순위로 처리
                level = milestone.get('level', '')
                is_skilled = (level == '숙련')
                
                # 타임스탬프 파싱 (examples 필드 활용)
                timestamp_offset = milestone.get('timestamp_offset', 300)
                if 'timestamp_offset' not in milestone and 'examples' in milestone:
                    examples = milestone['examples']
                    if isinstance(examples, list) and examples:
                        first_example = str(examples[0])
                        import re
                        # HH:MM:SS or MM:SS 찾기
                        match = re.search(r'(?:(\d{1,2}):)?(\d{1,2}):(\d{2})', first_example)
                        if match:
                            h, m, s = match.groups()
                            h = int(h) if h else 0
                            m = int(m)
                            s = int(s)
                            timestamp_offset = h * 3600 + m * 60 + s
                        else:
                            # examples에서 타임스탬프를 찾지 못하면 세그먼트 중간 지점 사용
                            timestamp_offset = 300  # 10분 세그먼트의 중간

                # 우선순위 결정
                is_priority = is_first or has_next_sign or is_skilled
                
                event_data = {
                    'type': 'development',
                    'title': milestone_name,
                    'description': milestone.get('description', '') or milestone.get('comment', '') or f"{milestone_name} 행동이 관찰되었습니다.",
                    'timestamp_offset': timestamp_offset,
                    'category': milestone.get('category', '발달'),
                    'is_priority': is_priority,
                    'event_type_label': (
                        "최초 발견" if is_first 
                        else ("다음 단계 징후" if has_next_sign 
                              else ("숙련 발달" if is_skilled 
                                    else "발달 행동"))
                    )
                }
                
                # 제목 포맷팅
                event_data['title'] = f"[{event_data['event_type_label']}] {event_data['title']}"
                
                if is_priority:
                    priority_candidates.append(event_data)
                else:
                    normal_candidates.append(event_data)
            
            # 1. 중요 이벤트는 최대 3개만 포함 (너무 많으면 우선순위 높은 것만)
            if priority_candidates:
                # 우선순위 정렬: 최초발생 > 다음단계징후 > 숙련
                priority_candidates.sort(key=lambda x: (
                    0 if '최초 발견' in x.get('event_type_label', '') else
                    1 if '다음 단계 징후' in x.get('event_type_label', '') else
                    2
                ))
                development_events.extend(priority_candidates[:3])
                print(f"[하이라이트] ✅ 우선순위 발달 이벤트 {min(len(priority_candidates), 3)}개 추가 (최대 3개)")
            
            # 2. 일반 발달 행동은 최대 2개만 포함 (클립 생성 수 제한)
            if normal_candidates:
                # 설명 길이 순 정렬 (구체적인 분석 내용이 있는 것을 우선)
                normal_candidates.sort(key=lambda x: len(x['description']), reverse=True)
                
                # 일반 발달 이벤트 최대 2개만 포함
                development_events.extend(normal_candidates[:2])
                print(f"[하이라이트] ✅ 일반 발달 이벤트 {min(len(normal_candidates), 2)}개 추가 (최대 2개)")
            else:
                print(f"[하이라이트] ℹ️  일반 발달 이벤트 없음")
        else:
            print(f"[하이라이트] ⚠️  development_milestones가 없거나 비어있음")

        
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
        # 세그먼트당 발달 전용 클립 개수 제한
        max_dev_only_clips = 2      # 발달 전용 클립 최대 2개
        dev_only_count = 0

        for group in merged_events:
            events = group['events']

            # 그룹 내 이벤트 타입 확인
            has_safety = any(e['type'] == 'safety' for e in events)
            has_development = any(e['type'] == 'development' for e in events)

            # 공통 시간 계산 (동일 그룹 내에서는 안전/발달 모두 같은 구간으로 본다)
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

            # 1) 안전 이벤트가 있는 경우: 안전 클립 생성
            if has_safety:
                safety_events = [e for e in events if e['type'] == 'safety']
                
                if safety_events:
                    if len(safety_events) == 1:
                        event = safety_events[0]
                        title = event['title']
                        description = event['description']
                        category = 'safety'
                        
                        severity = event.get('severity', '위험')
                        sub_category = f"🚨 {severity.upper()} 등급 안전 이벤트가 감지되었습니다"
                        if not title.startswith('['):
                            title = f"[안전] {title}"
                    else:
                        titles = [e['title'] for e in safety_events]
                        descriptions = [e['description'] for e in safety_events if e.get('description')]
                        category = 'safety'
                        
                        safety_count = len(safety_events)
                        sub_category = f"🚨 {safety_count}건의 안전 이벤트가 짧은 시간 내 연속 발생했습니다"
                        title = f"[안전] 복합 이벤트 ({safety_count}건)"
                        description = " / ".join(descriptions[:3]) if descriptions else " / ".join(titles[:3])
                    
                    print(f"[하이라이트] 📹 클립 생성: {title} ({duration}초)")
                    print(f"[하이라이트] 📁 원본 파일: {source_video} (존재: {source_video.exists()})")
                    
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
                        print(f"[하이라이트] ✅ 클립 생성 성공: {title}")
                    else:
                        print(f"[하이라이트] ❌ 클립 생성 실패: {title} (원인: create_highlight_clip이 None 반환)")

            # 2) 발달 이벤트만 있는 그룹 또는 안전과 혼합된 그룹에서 별도 발달 클립 생성
            if has_development:
                if dev_only_count >= max_dev_only_clips:
                    print(f"[하이라이트] ⏭️  발달 클립 스킵 (세그먼트당 최대 {max_dev_only_clips}개 초과)")
                else:
                    dev_events = [e for e in events if e['type'] == 'development']
                    if dev_events:
                        dev_only_count += 1
                        
                        if len(dev_events) == 1:
                            event = dev_events[0]
                            title = event['title']
                            description = event['description']
                            category = 'development'
                            
                            if '최초' in title:
                                sub_category = "🎉 아이의 새로운 발달 행동이 처음 관찰되었습니다"
                            else:
                                sub_category = "📈 다음 발달 단계로 나아가는 징후가 보입니다"
                            
                            if not title.startswith('['):
                                title = f"[발달] {title}"
                        else:
                            titles = [e['title'] for e in dev_events]
                            descriptions = [e['description'] for e in dev_events if e.get('description')]
                            category = 'development'
                            
                            dev_count = len(dev_events)
                            sub_category = f"📈 {dev_count}건의 중요한 발달 행동이 연속 관찰되었습니다"
                            title = f"[발달] 복합 이벤트 ({dev_count}건)"
                            description = " / ".join(descriptions[:3]) if descriptions else " / ".join(titles[:3])
                        
                        print(f"[하이라이트] 📹 클립 생성: {title} ({duration}초)")
                        print(f"[하이라이트] 📁 원본 파일: {source_video} (존재: {source_video.exists()})")
                        
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
                            print(f"[하이라이트] ✅ 클립 생성 성공: {title}")
                        else:
                            print(f"[하이라이트] ❌ 클립 생성 실패: {title} (원인: create_highlight_clip이 None 반환)")
        
        return clips_created
