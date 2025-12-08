"""영상 로드 테스트"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.live_monitoring.video_queue import VideoQueue

def test_video_loading():
    camera_id = "camera-1"
    # backend 루트 기준 경로 설정
    backend_dir = Path(__file__).resolve().parent.parent
    video_dir = backend_dir / "videos/camera-1"
    
    print(f"=" * 60)
    print(f"영상 로드 테스트: {camera_id}")
    print(f"=" * 60)
    
    # 폴더 확인
    short_dir = video_dir / "short"
    medium_dir = video_dir / "medium"
    
    print(f"\n📁 폴더 확인:")
    print(f"  Short 폴더: {short_dir}")
    print(f"    존재: {short_dir.exists()}")
    if short_dir.exists():
        short_files = list(short_dir.glob("*.mp4"))
        print(f"    파일 수: {len(short_files)}")
        for f in short_files:
            print(f"      - {f.name} ({f.stat().st_size / (1024*1024):.1f}MB)")
    
    print(f"\n  Medium 폴더: {medium_dir}")
    print(f"    존재: {medium_dir.exists()}")
    if medium_dir.exists():
        medium_files = list(medium_dir.glob("*.mp4"))
        print(f"    파일 수: {len(medium_files)}")
        for f in medium_files:
            print(f"      - {f.name} ({f.stat().st_size / (1024*1024):.1f}MB)")
    
    # VideoQueue 테스트
    print(f"\n🎬 VideoQueue 테스트:")
    queue = VideoQueue(camera_id, video_dir)
    queue.load_videos(shuffle=True, target_duration_minutes=60)
    
    print(f"  큐 크기: {queue.get_queue_size()}개")
    
    if queue.get_queue_size() > 0:
        print(f"\n  처음 5개 영상:")
        for i in range(min(5, queue.get_queue_size())):
            video = queue.get_next_video()
            if video:
                print(f"    {i+1}. {video.name}")
    else:
        print(f"  ❌ 큐가 비어있습니다!")
    
    print(f"\n" + "=" * 60)
    
    # OpenCV 테스트
    if queue.get_queue_size() > 0:
        print(f"\n🎥 OpenCV 테스트:")
        import cv2
        queue.reset()
        test_video = queue.get_next_video()
        if test_video:
            print(f"  테스트 영상: {test_video.name}")
            cap = cv2.VideoCapture(str(test_video))
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS)
                frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = frames / fps if fps > 0 else 0
                print(f"  ✅ OpenCV 읽기 성공")
                print(f"    FPS: {fps}")
                print(f"    프레임 수: {frames}")
                print(f"    길이: {duration:.1f}초 ({duration/60:.1f}분)")
                cap.release()
            else:
                print(f"  ❌ OpenCV 읽기 실패")

if __name__ == "__main__":
    test_video_loading()

