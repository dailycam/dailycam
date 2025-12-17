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
        self.cloudfront_domain = os.getenv("CLOUDFRONT_DOMAIN")
        
        if self.bucket_name:
            self.s3_client = boto3.client(
                's3',
                region_name=self.region,
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
            )
        else:
            self.s3_client = None
    
    def is_enabled(self) -> bool:
        """S3 서비스가 활성화되어 있는지 확인"""
        return self.s3_client is not None and self.bucket_name is not None
    
    def upload_clip(
        self, 
        file_path: Path, 
        clip_id: str,
        file_type: str = "video"
    ) -> Optional[str]:
        """클립 또는 썸네일을 S3에 업로드하고 URL 반환"""
        if not self.is_enabled() or not file_path.exists():
            return None
        
        try:
            file_extension = file_path.suffix
            if file_type == "thumbnail":
                s3_key = f"highlights/{clip_id}/thumbnail{file_extension}"
            else:
                s3_key = f"highlights/{clip_id}/video{file_extension}"
            
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
            
            if self.cloudfront_domain:
                url = f"https://{self.cloudfront_domain}/{s3_key}"
            else:
                url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            
            return url
            
        except Exception:
            return None
    
    def delete_clip(self, clip_id: str) -> bool:
        """클립과 관련된 모든 파일 삭제"""
        if not self.is_enabled():
            return False
        
        try:
            prefix = f"highlights/{clip_id}/"
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix)
            
            for page in pages:
                if 'Contents' in page:
                    objects = [{'Key': obj['Key']} for obj in page['Contents']]
                    if objects:
                        self.s3_client.delete_objects(
                            Bucket=self.bucket_name,
                            Delete={'Objects': objects}
                        )
            
            return True
            
        except Exception:
            return False
    
    def delete_by_url(self, url: str) -> bool:
        """URL로부터 S3 키를 추출하여 파일 삭제"""
        if not self.is_enabled():
            return False
        
        try:
            if self.cloudfront_domain and self.cloudfront_domain in url:
                s3_key = url.split(f"{self.cloudfront_domain}/", 1)[1]
            elif f"s3.{self.region}.amazonaws.com" in url:
                s3_key = url.split(f".s3.{self.region}.amazonaws.com/", 1)[1]
            else:
                return False
            
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            return True
            
        except Exception:
            return False
    
    def upload_archive(
        self, 
        file_path: Path, 
        camera_id: str,
        segment_start: datetime
    ) -> Optional[str]:
        """10분 아카이브 영상을 S3에 업로드"""
        if not self.is_enabled() or not file_path.exists():
            return None
        
        try:
            s3_key = f"archives/{camera_id}/{segment_start.strftime('%Y/%m/%d')}/{file_path.name}"
            
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': 'video/mp4',
                    'StorageClass': 'STANDARD',
                    'Metadata': {
                        'camera_id': camera_id,
                        'segment_start': segment_start.isoformat(),
                        'uploaded_at': datetime.now(timezone.utc).isoformat(),
                        'type': 'archive'
                    }
                }
            )
            
            if self.cloudfront_domain:
                url = f"https://{self.cloudfront_domain}/{s3_key}"
            else:
                url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            
            return url
            
        except Exception:
            return None
    
    def archive_exists(self, s3_key: str) -> bool:
        """S3에 아카이브 파일이 존재하는지 확인"""
        if not self.is_enabled():
            return False
        
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except Exception:
            return False
    
    def upload_camera_video(
        self,
        file_path: Path,
        camera_id: str,
        filename: str
    ) -> Optional[str]:
        """카메라 영상을 S3에 업로드"""
        if not self.is_enabled() or not file_path.exists():
            return None
        
        try:
            s3_key = f"videos/{camera_id}/{filename}"
            
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
            
            return s3_key
            
        except Exception:
            return None
    
    def download_camera_video(
        self,
        s3_key: str,
        local_path: Path
    ) -> bool:
        """S3에서 카메라 영상을 다운로드"""
        if not self.is_enabled():
            return False
        
        try:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            self.s3_client.download_file(
                self.bucket_name,
                s3_key,
                str(local_path)
            )
            
            return True
            
        except Exception:
            return False
    
    def download_archive(
        self,
        s3_key: str,
        local_path: Path
    ) -> bool:
        """S3에서 아카이브 영상을 다운로드"""
        if not self.is_enabled():
            return False
        
        try:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            self.s3_client.download_file(
                self.bucket_name,
                s3_key,
                str(local_path)
            )
            
            return True
            
        except Exception:
            return False
    
    def delete_archive(
        self,
        camera_id: str,
        segment_start: datetime
    ) -> bool:
        """S3에서 아카이브 영상 삭제"""
        if not self.is_enabled():
            return False
        
        try:
            archive_filename = f"archive_{segment_start.strftime('%Y%m%d_%H%M%S')}.mp4"
            s3_key = f"archives/{camera_id}/{segment_start.strftime('%Y/%m/%d')}/{archive_filename}"
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            return True
            
        except Exception:
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
        """지정된 일수보다 오래된 클립 목록 반환"""
        if not self.is_enabled():
            return []
        
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            prefix = "highlights/"
            
            old_clip_ids = []
            paginator = self.s3_client.get_paginator('list_objects_v2')
            
            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix, Delimiter='/'):
                if 'CommonPrefixes' in page:
                    for prefix_info in page['CommonPrefixes']:
                        clip_id = prefix_info['Prefix'].replace(prefix, '').rstrip('/')
                        
                        try:
                            video_key = f"{prefix}{clip_id}/video.mp4"
                            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=video_key)
                            
                            last_modified = response['LastModified']
                            if last_modified.replace(tzinfo=timezone.utc) < cutoff_date:
                                old_clip_ids.append(clip_id)
                        except ClientError:
                            continue
            
            return old_clip_ids
            
        except Exception:
            return []
