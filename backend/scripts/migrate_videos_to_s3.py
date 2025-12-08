"""
기존 로컬 영상 파일을 S3로 마이그레이션하는 스크립트

사용법:
    python scripts/migrate_videos_to_s3.py [--dry-run] [--camera-id CAMERA_ID]
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

# 환경 변수 로드
load_dotenv(project_root / '.env.production')

from app.utils.s3_utils import s3_client
import argparse
from tqdm import tqdm

def migrate_videos(camera_id: str = None, dry_run: bool = False):
    """영상 파일을 S3로 마이그레이션"""
    
    if not s3_client.is_enabled():
        print("❌ S3가 활성화되지 않았습니다. 환경 변수를 확인하세요.")
        return
    
    videos_dir = project_root / "videos"
    if not videos_dir.exists():
        print(f"❌ 영상 디렉토리가 없습니다: {videos_dir}")
        return
    
    # 마이그레이션할 파일 찾기
    video_files = []
    
    if camera_id:
        camera_dirs = [videos_dir / camera_id]
    else:
        camera_dirs = [d for d in videos_dir.iterdir() if d.is_dir()]
    
    for camera_dir in camera_dirs:
        for subdir in ['short', 'medium', 'long']:
            subdir_path = camera_dir / subdir
            if subdir_path.exists():
                for video_file in subdir_path.glob('*.mp4'):
                    video_files.append((camera_dir.name, subdir, video_file))
    
    if not video_files:
        print("마이그레이션할 영상 파일이 없습니다.")
        return
    
    print(f"📦 총 {len(video_files)}개의 영상 파일을 마이그레이션합니다.")
    if dry_run:
        print("🔍 [DRY RUN 모드] 실제로 업로드하지 않습니다.")
    
    success_count = 0
    fail_count = 0
    skip_count = 0
    
    for camera_id, subdir, video_file in tqdm(video_files, desc="마이그레이션 중"):
        # S3 키 생성
        s3_key = f"videos/{camera_id}/{subdir}/{video_file.name}"
        
        # 이미 S3에 있는지 확인
        if s3_client.file_exists(s3_key):
            skip_count += 1
            if not dry_run:
                print(f"⏭️  건너뜀 (이미 존재): {s3_key}")
            continue
        
        if dry_run:
            print(f"📤 [DRY RUN] 업로드 예정: {video_file.name} -> {s3_key}")
            success_count += 1
            continue
        
        # S3에 업로드
        try:
            video_url = s3_client.upload_file(
                video_file,
                s3_key,
                content_type='video/mp4',
                make_public=True
            )
            
            if video_url:
                success_count += 1
                print(f"✅ 업로드 완료: {video_file.name} -> {video_url}")
            else:
                fail_count += 1
                print(f"❌ 업로드 실패: {video_file.name}")
        except Exception as e:
            fail_count += 1
            print(f"❌ 업로드 오류: {video_file.name} - {e}")
    
    print("\n" + "="*50)
    print("마이그레이션 완료")
    print(f"✅ 성공: {success_count}")
    print(f"❌ 실패: {fail_count}")
    print(f"⏭️  건너뜀: {skip_count}")
    print("="*50)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="영상 파일을 S3로 마이그레이션")
    parser.add_argument("--dry-run", action="store_true", help="실제로 업로드하지 않고 시뮬레이션만 실행")
    parser.add_argument("--camera-id", help="특정 카메라 ID만 마이그레이션")
    
    args = parser.parse_args()
    
    migrate_videos(camera_id=args.camera_id, dry_run=args.dry_run)

