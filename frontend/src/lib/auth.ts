/**
 * 인증 토큰 관리 유틸리티
 * httpOnly Cookie 사용 (백엔드에서 설정, JavaScript 접근 불가)
 * 
 * 보안:
 * - httpOnly Cookie는 JavaScript로 접근 불가 (XSS 공격 방어)
 * - secure 플래그로 HTTPS에서만 전송
 * - sameSite 플래그로 CSRF 공격 방어
 * 
 * ⚠️ 주의: 
 * - 실제 인증은 백엔드의 httpOnly Cookie로 이루어집니다
 * - localStorage는 OAuth 콜백 처리 후 정리용으로만 사용됩니다
 */

const TOKEN_KEY = 'access_token'

/**
 * 토큰 삭제 (OAuth 콜백 후 정리용)
 * 
 * 주의: httpOnly Cookie는 백엔드 로그아웃 API가 삭제합니다.
 */
export function removeAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (error) {
    console.error('[Auth] 토큰 삭제 실패:', error)
  }
}
