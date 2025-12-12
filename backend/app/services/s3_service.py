"""AWS S3 서비스 - 클립 하이라이트 및 아카이브 영상 저장 및 관리"""

import os
import boto3
from pathlib import Path
from typing import Optional
from botocore.exceptions import ClientError
from datetime import datetime, timedelta, timezone


class S3Service:
    """S3 클립 하이라이트 및 아카이브 영상 관리 서비스"""
    
    def __init__(self):
        self.bucket_name = os.getenv("S3_BUCKET_NAME")
        self.region = os.getenv("AWS_REGION", "ap-northeast-2")
        self.cloudfront_domain = os.getenv("CLOUDFRONT_DOMAIN")  # 선택사항
        
        # S3 클라이언트 초기화
        if self.bucket_name:
            self.s3_client = boto3.client(
                's3',
                region_name=self.region,
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
            )
        else:
            self.s3_client = None
            print("[S3Service] ⚠️ S3_BUCKET_NAME이 설정되지 않았습니다. S3 기능이 비활성화됩니다.")
    
    def is_enabled(self) -> bool:
        """S3 서비스가 활성화되어 있는지 확인"""
        return self.s3_client is not None and self.bucket_name is not None
    
    def upload_clip(
        self, 
        file_path: Path, 
        clip_id: str,
        file_type: str = "video"  # "video" or "thumbnail"
    ) -> Optional[str]:
        """
        클립 또는 썸네일을 S3에 업로드하고 URL 반환
        
        Args:
            file_path: 업로드할 파일 경로
            clip_id: 클립 ID (고유 식별자)
            file_type: 파일 타입 ("video" or "thumbnail")
        
        Returns:
            S3 URL 또는 CloudFront URL (설정된 경우)
        """
        if not self.is_enabled():
            print(f"[S3Service] ⚠️ S3가 비활성화되어 있습니다. 업로드 스킵: {file_path.name}")
            return None
        
        if not file_path.exists():
            print(f"[S3Service] ❌ 파일이 존재하지 않습니다: {file_path}")
            return None
        
        try:
            # S3 키 생성: highlights/{clip_id}/{filename}
            file_extension = file_path.suffix
            if file_type == "thumbnail":
                s3_key = f"highlights/{clip_id}/thumbnail{file_extension}"
            else:
                s3_key = f"highlights/{clip_id}/video{file_extension}"
            
            # 파일 업로드
            print(f"[S3Service] 📤 업로드 시작: {file_path.name} → s3://{self.bucket_name}/{s3_key}")
            
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': self._get_content_type(file_extension),
                    'Metadata': {
                        'clip_id': clip_id,
                        'uploaded_at': datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # URL 생성
            if self.cloudfront_domain:
                url = f"https://{self.cloudfront_domain}/{s3_key}"
            else:
                url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            print(f"[S3Service] ✅ 업로드 완료: {url} ({file_size_mb:.2f}MB)")
            
            return url
            
        except ClientError as e:
            print(f"[S3Service] ❌ S3 업로드 실패: {e}")
            return None
        except Exception as e:
            print(f"[S3Service] ❌ 업로드 중 오류 발생: {e}")
            return None
    
    def delete_clip(self, clip_id: str) -> bool:
        """
        클립과 관련된 모든 파일(S3 키) 삭제
        
        Args:
            clip_id: 삭제할 클립 ID
        
        Returns:
            삭제 성공 여부
        """
        if not self.is_enabled():
            print(f"[S3Service] ⚠️ S3가 비활성화되어 있습니다. 삭제 스킵: {clip_id}")
            return False
        
        try:
            # highlights/{clip_id}/ 하위의 모든 파일 삭제
            prefix = f"highlights/{clip_id}/"
            
            print(f"[S3Service] 🗑️ 삭제 시작: s3://{self.bucket_name}/{prefix}*")
            
            # 해당 prefix의 모든 객체 목록 가져오기
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix)
            
            deleted_count = 0
            for page in pages:
                if 'Contents' in page:
                    objects = [{'Key': obj['Key']} for obj in page['Contents']]
                    if objects:
                        self.s3_client.delete_objects(
                            Bucket=self.bucket_name,
                            Delete={'Objects': objects}
                        )
                        deleted_count += len(objects)
            
            if deleted_count > 0:
                print(f"[S3Service] ✅ 삭제 완료: {deleted_count}개 파일")
            else:
                print(f"[S3Service] ℹ️ 삭제할 파일 없음: {clip_id}")
            
            return True
            
        except ClientError as e:
            print(f"[S3Service] ❌ S3 삭제 실패: {e}")
            return False
        except Exception as e:
            print(f"[S3Service] ❌ 삭제 중 오류 발생: {e}")
            return False
    
    def delete_by_url(self, url: str) -> bool:
        """
        URL로부터 S3 키를 추출하여 파일 삭제
        
        Args:
            url: S3 URL 또는 CloudFront URL
        
        Returns:
            삭제 성공 여부
        """
        if not self.is_enabled():
            return False
        
        try:
            # URL에서 S3 키 추출
            if self.cloudfront_domain and self.cloudfront_domain in url:
                # CloudFront URL: https://domain.com/highlights/{clip_id}/...
                s3_key = url.split(f"{self.cloudfront_domain}/", 1)[1]
            elif f"s3.{self.region}.amazonaws.com" in url:
                # S3 URL: https://bucket.s3.region.amazonaws.com/highlights/{clip_id}/...
                s3_key = url.split(f".s3.{self.region}.amazonaws.com/", 1)[1]
            else:
                print(f"[S3Service] ❌ URL 형식을 인식할 수 없습니다: {url}")
                return False
            
            # 파일 삭제
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            print(f"[S3Service] ✅ 파일 삭제 완료: {s3_key}")
            return True
            
        except Exception as e:
            print(f"[S3Service] ❌ URL 기반 삭제 실패: {e}")
            return False
    
    def upload_archive(
        self, 
        file_path: Path, 
        camera_id: str,
        segment_start: datetime
    ) -> Optional[str]:
        """
        10분 아카이브 영상을 S3에 업로드 (1일 후 자동 삭제)
        
        Args:
            file_path: 업로드할 아카이브 파일 경로
            camera_id: 카메라 ID
            segment_start: 세그먼트 시작 시간
        
        Returns:
            S3 URL (성공 시) 또는 None (실패 시)
        """
        if not self.is_enabled():
            print(f"[S3Service] ⚠️ S3가 비활성화되어 있습니다. 아카이브 업로드 스킵: {file_path.name}")
            return None
        
        if not file_path.exists():
            print(f"[S3Service] ❌ 아카이브 파일이 존재하지 않습니다: {file_path}")
            return None
        
        try:
            # S3 키 생성: archives/{camera_id}/{YYYY}/{MM}/{DD}/archive_{timestamp}.mp4
            s3_key = f"archives/{camera_id}/{segment_start.strftime('%Y/%m/%d')}/{file_path.name}"
            
            # 파일 업로드
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            print(f"[S3Service] 📤 아카이브 업로드 시작: {file_path.name} ({file_size_mb:.2f}MB) → s3://{self.bucket_name}/{s3_key}")
            
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': 'video/mp4',
                    'StorageClass': 'STANDARD',  # Lifecycle Policy로 자동 전환됨
                    'Metadata': {
                        'camera_id': camera_id,
                        'segment_start': segment_start.isoformat(),
                        'uploaded_at': datetime.now(timezone.utc).isoformat(),
                        'type': 'archive'
                    }
                }
            )
            
            # URL 생성
            if self.cloudfront_domain:
                url = f"https://{self.cloudfront_domain}/{s3_key}"
            else:
                url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            
            print(f"[S3Service] ✅ 아카이브 업로드 완료: {url}")
            
            return url
            
        except ClientError as e:
            print(f"[S3Service] ❌ 아카이브 S3 업로드 실패: {e}")
            return None
        except Exception as e:
            print(f"[S3Service] ❌ 아카이브 업로드 중 오류 발생: {e}")
            return None
    
    def archive_exists(self, s3_key: str) -> bool:
        """
        S3에 아카이브 파일이 존재하는지 확인
        
        Args:
            s3_key: S3 키 (예: archives/camera-1/2025/12/09/archive_20251209_100000.mp4)
        
        Returns:
            파일 존재 여부
        """
        if not self.is_enabled():
            return False
        
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == '404' or error_code == 'NoSuchKey':
                return False
            # 다른 에러는 예외 발생
            print(f"[S3Service] ⚠️ S3 파일 존재 확인 중 오류: {e}")
            return False
        except Exception as e:
            print(f"[S3Service] ⚠️ 파일 존재 확인 중 오류 발생: {e}")
            return False
    
    def upload_camera_video(
        self,
        file_path: Path,
        camera_id: str,
        filename: str
    ) -> Optional[str]:
        """
        카메라 영상을 S3에 업로드
        
        Args:
            file_path: 업로드할 영상 파일 경로
            camera_id: 카메라 ID
            filename: 파일명
        
        Returns:
            S3 키 (성공 시) 또는 None (실패 시)
        """
        if not self.is_enabled():
            print(f"[S3Service] ⚠️ S3가 비활성화되어 있습니다. 카메라 영상 업로드 스킵: {filename}")
            return None
        
        if not file_path.exists():
            print(f"[S3Service] ❌ 파일이 존재하지 않습니다: {file_path}")
            return None
        
        try:
            # S3 키 생성: videos/{camera_id}/{filename}
            s3_key = f"videos/{camera_id}/{filename}"
            
            # 파일 업로드
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            print(f"[S3Service] 📤 카메라 영상 업로드 시작: {filename} ({file_size_mb:.2f}MB) → s3://{self.bucket_name}/{s3_key}")
            
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': 'video/mp4',
                    'Metadata': {
                        'camera_id': camera_id,
                        'uploaded_at': datetime.now(timezone.utc).isoformat(),
                        'type': 'camera_video'
                    }
                }
            )
            
            print(f"[S3Service] ✅ 카메라 영상 업로드 완료: {s3_key}")
            return s3_key
            
        except ClientError as e:
            print(f"[S3Service] ❌ 카메라 영상 S3 업로드 실패: {e}")
            return None
        except Exception as e:
            print(f"[S3Service] ❌ 카메라 영상 업로드 중 오류 발생: {e}")
            return None
    
    def download_camera_video(
        self,
        s3_key: str,
        local_path: Path
    ) -> bool:
        """
        S3에서 카메라 영상을 다운로드
        
        Args:
            s3_key: S3 키 (예: videos/camera-1/filename.mp4)
            local_path: 다운로드할 로컬 경로
        
        Returns:
            다운로드 성공 여부
        """
        if not self.is_enabled():
            print(f"[S3Service] ⚠️ S3가 비활성화되어 있습니다. 다운로드 스킵: {s3_key}")
            return False
        
        try:
            # 로컬 디렉토리 생성
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            print(f"[S3Service] 📥 카메라 영상 다운로드 시작: s3://{self.bucket_name}/{s3_key} → {local_path}")
            
            self.s3_client.download_file(
                self.bucket_name,
                s3_key,
                str(local_path)
            )
            
            file_size_mb = local_path.stat().st_size / (1024 * 1024)
            print(f"[S3Service] ✅ 카메라 영상 다운로드 완료: {local_path.name} ({file_size_mb:.2f}MB)")
            
            return True
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'NoSuchKey':
                print(f"[S3Service] ❌ S3에 파일이 존재하지 않습니다: {s3_key}")
            else:
                print(f"[S3Service] ❌ 카메라 영상 S3 다운로드 실패: {e}")
            return False
        except Exception as e:
            print(f"[S3Service] ❌ 다운로드 중 오류 발생: {e}")
            return False
    
    def download_archive(
        self,
        s3_key: str,
        local_path: Path
    ) -> bool:
        """
        S3에서 아카이브 영상을 다운로드
        
        Args:
            s3_key: S3 키 (예: archives/camera-1/2025/12/09/archive_20251209_100000.mp4)
            local_path: 다운로드할 로컬 경로
        
        Returns:
            다운로드 성공 여부
        """
        if not self.is_enabled():
            print(f"[S3Service] ⚠️ S3가 비활성화되어 있습니다. 다운로드 스킵: {s3_key}")
            return False
        
        try:
            # 로컬 디렉토리 생성
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            print(f"[S3Service] 📥 아카이브 다운로드 시작: s3://{self.bucket_name}/{s3_key} → {local_path}")
            
            self.s3_client.download_file(
                self.bucket_name,
                s3_key,
                str(local_path)
            )
            
            file_size_mb = local_path.stat().st_size / (1024 * 1024)
            print(f"[S3Service] ✅ 아카이브 다운로드 완료: {local_path.name} ({file_size_mb:.2f}MB)")
            
            return True
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'NoSuchKey':
                print(f"[S3Service] ❌ S3에 파일이 존재하지 않습니다: {s3_key}")
            else:
                print(f"[S3Service] ❌ 아카이브 S3 다운로드 실패: {e}")
            return False
        except Exception as e:
            print(f"[S3Service] ❌ 다운로드 중 오류 발생: {e}")
            return False
    
    def delete_archive(
        self,
        camera_id: str,
        segment_start: datetime
    ) -> bool:
        """
        S3에서 아카이브 영상 삭제
        
        Args:
            camera_id: 카메라 ID
            segment_start: 세그먼트 시작 시간
        
        Returns:
            삭제 성공 여부
        """
        if not self.is_enabled():
            print(f"[S3Service] ⚠️ S3가 비활성화되어 있습니다. 삭제 스킵")
            return False
        
        try:
            # S3 키 생성 (upload_archive와 동일한 형식)
            archive_filename = f"archive_{segment_start.strftime('%Y%m%d_%H%M%S')}.mp4"
            s3_key = f"archives/{camera_id}/{segment_start.strftime('%Y/%m/%d')}/{archive_filename}"
            
            print(f"[S3Service] 🗑️ 아카이브 삭제 시작: s3://{self.bucket_name}/{s3_key}")
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            print(f"[S3Service] ✅ 아카이브 삭제 완료: {archive_filename}")
            return True
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'NoSuchKey':
                print(f"[S3Service] ℹ️ S3에 파일이 존재하지 않습니다 (이미 삭제됨): {s3_key}")
                return True  # 이미 삭제된 경우 성공으로 처리
            else:
                print(f"[S3Service] ❌ 아카이브 S3 삭제 실패: {e}")
            return False
        except Exception as e:
            print(f"[S3Service] ❌ 삭제 중 오류 발생: {e}")
            return False
    
    def _get_content_type(self, extension: str) -> str:
        """파일 확장자에 따른 Content-Type 반환"""
        content_types = {
            '.mp4': 'video/mp4',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp'
        }
        return content_types.get(extension.lower(), 'application/octet-stream')
    
    def list_old_clips(self, days: int = 7) -> list:
        """
        지정된 일수보다 오래된 클립 목록 반환 (S3 Lifecycle Policy 대신 사용 가능)
        
        Args:
            days: 기준 일수 (기본값: 7일)
        
        Returns:
            오래된 클립 ID 목록
        """
        if not self.is_enabled():
            return []
        
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            prefix = "highlights/"
            
            old_clip_ids = []
            paginator = self.s3_client.get_paginator('list_objects_v2')
            
            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix, Delimiter='/'):
                # CommonPrefixes는 폴더(클립 ID) 목록
                if 'CommonPrefixes' in page:
                    for prefix_info in page['CommonPrefixes']:
                        # highlights/{clip_id}/ 형태에서 clip_id 추출
                        clip_id = prefix_info['Prefix'].replace(prefix, '').rstrip('/')
                        
                        # 해당 클립의 메타데이터 확인
                        try:
                            # video 파일의 메타데이터 확인
                            video_key = f"{prefix}{clip_id}/video.mp4"
                            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=video_key)
                            
                            # 업로드 시간 확인
                            last_modified = response['LastModified']
                            if last_modified.replace(tzinfo=timezone.utc) < cutoff_date:
                                old_clip_ids.append(clip_id)
                        except ClientError:
                            # 파일이 없으면 스킵
                            continue
            
            return old_clip_ids
            
        except Exception as e:
            print(f"[S3Service] ❌ 오래된 클립 목록 조회 실패: {e}")
            return []

