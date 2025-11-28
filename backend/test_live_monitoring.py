"""라이브 모니터링 기능 테스트 스크립트"""

import requests
import time

API_BASE_URL = "http://localhost:8000"

def test_api_health():
    """API 서버 상태 확인"""
    print("\n=== API 서버 상태 확인 ===")
    try:
        response = requests.get(f"{API_BASE_URL}/")
        print(f"✓ 서버 응답: {response.status_code}")
        print(f"  {response.json()}")
        return True
    except Exception as e:
        print(f"✗ 서버 연결 실패: {e}")
        return False

def test_start_stream(camera_id="camera-1"):
    """스트림 시작 테스트"""
    print(f"\n=== 스트림 시작 테스트: {camera_id} ===")
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/live-monitoring/start-stream/{camera_id}",
            params={"enable_analysis": True}
        )
        print(f"✓ 응답: {response.status_code}")
        print(f"  {response.json()}")
        return True
    except Exception as e:
        print(f"✗ 스트림 시작 실패: {e}")
        return False

def test_stream_status(camera_id="camera-1"):
    """스트림 상태 확인"""
    print(f"\n=== 스트림 상태 확인: {camera_id} ===")
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/live-monitoring/status/{camera_id}"
        )
        print(f"✓ 응답: {response.status_code}")
        data = response.json()
        print(f"  실행 중: {data.get('is_running')}")
        print(f"  시간대 파일 수: {data.get('hourly_files_count')}")
        if data.get('hourly_files'):
            print(f"  최근 파일: {data['hourly_files']}")
        return True
    except Exception as e:
        print(f"✗ 상태 확인 실패: {e}")
        return False

def test_list_hourly_files(camera_id="camera-1"):
    """1시간 단위 파일 목록 조회"""
    print(f"\n=== 1시간 단위 파일 목록: {camera_id} ===")
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/live-monitoring/list-hourly-files/{camera_id}"
        )
        print(f"✓ 응답: {response.status_code}")
        data = response.json()
        print(f"  총 파일 수: {data.get('total_files')}")
        for file_info in data.get('files', []):
            print(f"  - {file_info['filename']} ({file_info['size_mb']}MB)")
        return True
    except Exception as e:
        print(f"✗ 파일 목록 조회 실패: {e}")
        return False

def test_stop_stream(camera_id="camera-1"):
    """스트림 중지 테스트"""
    print(f"\n=== 스트림 중지 테스트: {camera_id} ===")
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/live-monitoring/stop-stream/{camera_id}"
        )
        print(f"✓ 응답: {response.status_code}")
        print(f"  {response.json()}")
        return True
    except Exception as e:
        print(f"✗ 스트림 중지 실패: {e}")
        return False

def main():
    """메인 테스트 실행"""
    print("=" * 60)
    print("라이브 모니터링 API 테스트")
    print("=" * 60)
    
    # 1. API 서버 상태 확인
    if not test_api_health():
        print("\n❌ 서버가 실행 중이지 않습니다. 먼저 서버를 시작하세요:")
        print("   cd backend && python -m uvicorn app.main:app --reload")
        return
    
    # 2. 스트림 시작
    test_start_stream()
    
    # 3. 잠시 대기 (스트림이 시작되도록)
    print("\n⏳ 10초 대기 중... (스트림 시작)")
    time.sleep(10)
    
    # 4. 스트림 상태 확인
    test_stream_status()
    
    # 5. 파일 목록 확인
    test_list_hourly_files()
    
    # 6. 스트림 중지
    print("\n계속 실행하려면 Ctrl+C로 중단하고, 중지하려면 Enter를 누르세요...")
    input()
    
    test_stop_stream()
    
    print("\n" + "=" * 60)
    print("테스트 완료!")
    print("=" * 60)

if __name__ == "__main__":
    main()

