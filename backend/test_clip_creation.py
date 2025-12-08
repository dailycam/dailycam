"""클립 생성 테스트 스크립트"""
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import SessionLocal
from app.services.highlight_clip_service import HighlightClipService

def test_clip_creation():
    """테스트 클립 생성"""
    
    # 아카이브 디렉토리 확인
    archive_dir = Path("temp_videos/hls_buffer/camera-1/archive")
    
    if not archive_dir.exists():
        print(f"❌ 아카이브 디렉토리가 없습니다: {archive_dir}")
        return
    
    # 아카이브 영상 찾기
    archive_videos = sorted(archive_dir.glob("archive_*.mp4"), reverse=True)
    
    if not archive_videos:
        print(f"❌ 아카이브 영상이 없습니다: {archive_dir}")
        return
    
    source_video = archive_videos[0]
    print(f"✅ 원본 영상 찾음: {source_video}")
    print(f"   파일 크기: {source_video.stat().st_size / (1024*1024):.2f} MB")
    
    # DB 세션 생성
    db = SessionLocal()
    
    try:
        # 클립 생성 서비스 초기화
        service = HighlightClipService()
        
        print(f"\n🎬 클립 생성 시작...")
        print(f"   원본: {source_video}")
        print(f"   시작: 10초")
        print(f"   길이: 30초")
        
        # 클립 생성
        result = service.create_highlight_clip(
            source_video_path=str(source_video),
            start_time=10,
            duration=30,
            title="테스트 하이라이트 클립",
            description="자동 생성된 테스트 클립입니다",
            category="safety",
            db=db
        )
        
        if result:
            print(f"\n✅ 클립 생성 성공!")
            print(f"   클립 ID: {result.get('clip_id')}")
            print(f"   비디오 URL: {result.get('video_url')}")
            print(f"   썸네일 URL: {result.get('thumbnail_url')}")
            print(f"   다운로드 URL: {result.get('download_url')}")
            
            # 파일 존재 확인
            video_path = Path(result['video_url'].lstrip('/'))
            if video_path.exists():
                print(f"\n✅ 클립 파일 생성 확인:")
                print(f"   경로: {video_path}")
                print(f"   크기: {video_path.stat().st_size / (1024*1024):.2f} MB")
            else:
                print(f"\n⚠️  클립 파일이 생성되지 않았습니다: {video_path}")
        else:
            print(f"\n❌ 클립 생성 실패 (None 반환)")
            
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_clip_creation()
