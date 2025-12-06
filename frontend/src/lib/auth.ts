/**
 * 인증 토큰 관리 유틸리티
 * sessionStorage 사용 (브라우저 탭 닫으면 자동 로그아웃)
 */

const TOKEN_KEY = 'access_token'

/**
 * 토큰 저장 (sessionStorage에만 저장)
 * 브라우저 탭을 닫으면 자동으로 삭제됩니다.
 */
export function setAuthToken(token: string): void {
  try {
    // sessionStorage에 저장 (탭 닫으면 자동 삭제)
    sessionStorage.setItem(TOKEN_KEY, token)

    console.log('[Auth] 토큰 저장 완료 (sessionStorage)')
  } catch (error) {
    console.error('[Auth] 토큰 저장 실패:', error)
    throw new Error('토큰 저장에 실패했습니다.')
  }
}

/**
 * 토큰 조회 (sessionStorage에서 조회)
 * 브라우저 탭을 닫으면 자동으로 삭제됩니다.
 */
export function getAuthToken(): string | null {
  try {
    // sessionStorage에서 조회
    const token = sessionStorage.getItem(TOKEN_KEY)

    if (token) {
      console.log('[Auth] 토큰 조회 성공')
    } else {
      console.log('[Auth] 토큰 없음')
    }
    return token
  } catch (error) {
    console.error('[Auth] 토큰 조회 실패:', error)
    return null
  }
}

/**
 * 토큰 삭제 (sessionStorage에서 삭제)
 */
export function removeAuthToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    console.log('[Auth] 토큰 삭제 완료 (sessionStorage)')
  } catch (error) {
    console.error('[Auth] 토큰 삭제 실패:', error)
  }
}

/**
 * 토큰 존재 여부 확인
 */
export function hasAuthToken(): boolean {
  return getAuthToken() !== null
}

/**
 * API 요청용 Authorization 헤더 생성
 */
export function getAuthHeader(): HeadersInit {
  const token = getAuthToken()
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    }
  }
  return {}
}
