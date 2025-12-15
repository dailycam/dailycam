# 배포 및 운영 FAQ (Troubleshooting)

## 1. HLS 재생 실패 (CORS & Mixed Content)

### 증상
*   로컬(`localhost`)에서는 영상이 잘 나오는데, 서버 배포 후 영상이 재생되지 않음.
*   브라우저 콘솔 에러: `Access to XMLHttpRequest ... has been blocked by CORS policy` 또는 `Mixed Content` 위험 경고.

### 원인 및 해결 (Fact)
1.  **CORS (Cross-Origin Resource Sharing)**
    *   **원인**: 프론트엔드(`domain.com`)와 스트리밍 서버(`stream.domain.com` 또는 IP) 도메인이 다를 때 브라우저가 보안상 차단.
    *   **해결**: Nginx 설정(`nginx.conf`)에서 HLS 관련 확장자(`.m3u8`, `.ts`)에 대해 `Access-Control-Allow-Origin *` 헤더를 반드시 추가해야 합니다.
    *   *현재 코드*: `docker-compose.streaming.yml` 내 Nginx 설정 확인 필요.

2.  **Mixed Content (HTTPS 혼합 콘텐츠)**
    *   **원인**: 프론트엔드는 `HTTPS`로 접속했는데, 비디오 소스 URL이 `HTTP`인 경우 브라우저가 "안전하지 않은 리소스"라며 차단함.
    *   **해결**: 스트리밍 서버도 SSL 인증서를 적용하여 `HTTPS`로 서빙해야 합니다. (AWS Lightsail Load Balancer 또는 Nginx SSL 설정 필요)

---

## 2. Docker 파일 권한 문제 (Permission Denied)

### 증상
*   컨테이너 로그에 `Permission denied: '/app/temp_videos/...'` 에러 발생.
*   FFmpeg가 `.ts` 세그먼트 파일을 생성하지 못하고 종료됨.

### 원인 및 해결 (Fact)
*   **원인**: 호스트 머신의 폴더(`backend/temp_videos`)가 `root` 권한으로 생성되었는데, 컨테이너 내부의 앱은 일반 사용자(또는 다른 UID)로 실행될 때 발생.
*   **해결**:
    1.  `docker-compose.yml`에서 볼륨 마운트 시 권한 주의.
    2.  `Dockerfile` 또는 시작 스크립트에서 `chmod -R 777 /app/temp_videos` 등으로 쓰기 권한을 명시적으로 부여해야 함.

---

## 3. 502 Bad Gateway (Nginx)

### 증상
*   API 호출 시 Nginx가 `502 Bad Gateway` 에러를 뱉음.

### 원인 및 해결 (Fact)
*   **원인**: 백엔드 `uvicorn` 서버가 아직 부팅되지 않았거나 죽었을 때 발생.
*   **해결**:
    *   백엔드 컨테이너가 정상 실행 중인지 확인 (`docker logs`).
    *   `uvicorn`이 `127.0.0.1`이 아닌 `0.0.0.0`으로 바인딩되어 있는지 확인 (Docker 간 통신 필수).
