# Google OAuth 환경 변수 설정

백엔드 `.env` 파일에 다음 환경 변수를 추가하세요:

```env
# 기존 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=1111
DB_NAME=dailycam

# Google OAuth 설정
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# JWT 설정
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# 프론트엔드 URL
FRONTEND_URL=http://localhost:5173
```

## Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. "API 및 서비스" > "사용자 인증 정보" 이동
4. "+ 사용자 인증 정보 만들기" > "OAuth 2.0 클라이언트 ID" 선택
5. 애플리케이션 유형: "웹 애플리케이션" 선택
6. **승인된 리디렉션 URI** 추가:
   - `http://localhost:8000/api/auth/google/callback`
7. "만들기" 클릭
8. 생성된 **클라이언트 ID**와 **클라이언트 보안 비밀**을 복사하여 `.env` 파일에 추가

## JWT Secret Key 생성

Python에서 안전한 시크릿 키 생성:

```python
import secrets
print(secrets.token_urlsafe(32))
```

또는 온라인 생성기 사용: https://randomkeygen.com/
