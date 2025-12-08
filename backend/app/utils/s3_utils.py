"""AWS S3 유틸리티 모듈"""

import os
import boto3
from pathlib import Path
from typing import Optional, BinaryIO
from botocore.config import Config
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)

class S3Client:
    """S3 클라이언트 래퍼"""
    
    def __init__(self):
        self.bucket_name = os.getenv('S3_BUCKET_NAME')
        self.region = os.getenv('AWS_REGION', 'ap-northeast-2')
        self.cloudfront_url = os.getenv('CLOUDFRONT_URL', '')
        
        # S3 클라이언트 초기화
        self.client = None
        if self.bucket_name:
            try:
                self.client = boto3.client(
                    's3',
                    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                    region_name=self.region,
                    config=Config(
                        signature_version='s3v4',
                        s3={'addressing_style': 'path'}
                    )
                )
                logger.info(f"S3 클라이언트 초기화 완료: {self.bucket_name} ({self.region})")
            except Exception as e:
                logger.error(f"S3 클라이언트 초기화 실패: {e}")
                self.client = None
    
    def is_enabled(self) -> bool:
        """S3가 활성화되어 있는지 확인"""
        return self.client is not None and self.bucket_name is not None
    
    def upload_file(
        self,
        file_path: Path,
        s3_key: str,
        content_type: Optional[str] = None,
        make_public: bool = False
    ) -> Optional[str]:
        """
        파일을 S3에 업로드
        
        Args:
            file_path: 로컬 파일 경로
            s3_key: S3 객체 키 (경로)
            content_type: 파일 MIME 타입
            make_public: 공개 읽기 권한 부여 여부
        
        Returns:
            업로드된 파일의 URL (CloudFront 또는 S3 URL)
        """
        if not self.is_enabled():
            logger.warning("S3가 활성화되지 않았습니다. 로컬 저장소를 사용합니다.")
            return None
        
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            if make_public:
                extra_args['ACL'] = 'public-read'
            
            self.client.upload_file(
                str(file_path),
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            # URL 생성 (CloudFront 우선, 없으면 S3 URL)
            if self.cloudfront_url:
                url = f"{self.cloudfront_url.rstrip('/')}/{s3_key}"
            else:
                url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            
            logger.info(f"S3 업로드 완료: {s3_key} -> {url}")
            return url
            
        except ClientError as e:
            logger.error(f"S3 업로드 실패: {s3_key} - {e}")
            return None
        except Exception as e:
            logger.error(f"S3 업로드 중 오류 발생: {s3_key} - {e}")
            return None
    
    def upload_fileobj(
        self,
        file_obj: BinaryIO,
        s3_key: str,
        content_type: Optional[str] = None,
        make_public: bool = False
    ) -> Optional[str]:
        """
        파일 객체를 S3에 업로드 (메모리에서 직접 업로드)
        
        Args:
            file_obj: 파일 객체 (BytesIO 등)
            s3_key: S3 객체 키
            content_type: 파일 MIME 타입
            make_public: 공개 읽기 권한 부여 여부
        
        Returns:
            업로드된 파일의 URL
        """
        if not self.is_enabled():
            logger.warning("S3가 활성화되지 않았습니다.")
            return None
        
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            if make_public:
                extra_args['ACL'] = 'public-read'
            
            self.client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            # URL 생성
            if self.cloudfront_url:
                url = f"{self.cloudfront_url.rstrip('/')}/{s3_key}"
            else:
                url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            
            logger.info(f"S3 업로드 완료 (fileobj): {s3_key} -> {url}")
            return url
            
        except ClientError as e:
            logger.error(f"S3 업로드 실패 (fileobj): {s3_key} - {e}")
            return None
        except Exception as e:
            logger.error(f"S3 업로드 중 오류 발생 (fileobj): {s3_key} - {e}")
            return None
    
    def delete_file(self, s3_key: str) -> bool:
        """
        S3에서 파일 삭제
        
        Args:
            s3_key: S3 객체 키
        
        Returns:
            삭제 성공 여부
        """
        if not self.is_enabled():
            return False
        
        try:
            self.client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"S3 파일 삭제 완료: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"S3 파일 삭제 실패: {s3_key} - {e}")
            return False
    
    def file_exists(self, s3_key: str) -> bool:
        """
        S3에 파일이 존재하는지 확인
        
        Args:
            s3_key: S3 객체 키
        
        Returns:
            파일 존재 여부
        """
        if not self.is_enabled():
            return False
        
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            logger.error(f"S3 파일 존재 확인 실패: {s3_key} - {e}")
            return False
    
    def get_presigned_url(self, s3_key: str, expiration: int = 3600) -> Optional[str]:
        """
        프리사인드 URL 생성 (임시 접근 URL)
        
        Args:
            s3_key: S3 객체 키
            expiration: URL 유효 시간 (초, 기본 1시간)
        
        Returns:
            프리사인드 URL
        """
        if not self.is_enabled():
            return None
        
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"프리사인드 URL 생성 실패: {s3_key} - {e}")
            return None
    
    def get_url(self, s3_key: str) -> Optional[str]:
        """
        파일의 공개 URL 반환 (CloudFront 또는 S3 URL)
        
        Args:
            s3_key: S3 객체 키
        
        Returns:
            파일 URL
        """
        if not self.is_enabled():
            return None
        
        if self.cloudfront_url:
            return f"{self.cloudfront_url.rstrip('/')}/{s3_key}"
        else:
            return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"


# 전역 S3 클라이언트 인스턴스
s3_client = S3Client()

