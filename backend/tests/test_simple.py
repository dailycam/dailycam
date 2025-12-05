"""간단한 영상 로드 테스트"""
from pathlib import Path
import cv2

def test():
    video_dir = Path("videos/camera-1")
    short_dir = video_dir / "short"
    medium_dir = video_dir / "medium"
    
    print("=" * 60)
    print("영상 파일 확인")
    print("=" * 60)
    
    # Short 폴더
    print(f"\n[Short] 폴더: {short_dir}")
    print(f"   존재: {short_dir.exists()}")
    if short_dir.exists():
        short_files = list(short_dir.glob("*.mp4"))
        print(f"   파일 수: {len(short_files)}")
        for f in short_files:
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"     - {f.name[:30]}... ({size_mb:.1f}MB)")
            
            # OpenCV 테스트
            cap = cv2.VideoCapture(str(f))
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS)
                frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = frames / fps if fps > 0 else 0
                print(f"       [OK] 읽기 가능: {fps}fps, {frames}프레임, {duration:.1f}초")
                cap.release()
            else:
                print(f"       [ERROR] 읽기 실패")
    
    # Medium 폴더
    print(f"\n[Medium] 폴더: {medium_dir}")
    print(f"   존재: {medium_dir.exists()}")
    if medium_dir.exists():
        medium_files = list(medium_dir.glob("*.mp4"))
        print(f"   파일 수: {len(medium_files)}")
        for f in medium_files:
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"     - {f.name[:30]}... ({size_mb:.1f}MB)")
            
            # OpenCV 테스트
            cap = cv2.VideoCapture(str(f))
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS)
                frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = frames / fps if fps > 0 else 0
                print(f"       [OK] 읽기 가능: {fps}fps, {frames}프레임, {duration:.1f}초")
                cap.release()
            else:
                print(f"       [ERROR] 읽기 실패")
    
    # 총계
    total_short = len(list(short_dir.glob("*.mp4"))) if short_dir.exists() else 0
    total_medium = len(list(medium_dir.glob("*.mp4"))) if medium_dir.exists() else 0
    total = total_short + total_medium
    
    print(f"\n" + "=" * 60)
    print(f"총 영상 파일: {total}개 (short: {total_short}, medium: {total_medium})")
    
    if total == 0:
        print("[ERROR] 영상 파일이 없습니다!")
    else:
        print("[OK] 영상 파일 확인 완료")
    print("=" * 60)

if __name__ == "__main__":
    test()

