/**
 * 인증 토큰 관리 유틸리티
 * localStorage와 쿠키 모두 지원 (페이지 이동 시 자동 유지)
 */

const TOKEN_KEY = 'access_token'
const COOKIE_NAME = 'access_token'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7일 (초 단위)

/**
 * 쿠키 설정 헬퍼
 */
function setCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`
}

/**
 * 쿠키 조회 헬퍼
 */
function getCookie(name: string): string | null {
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

/**
 * 쿠키 삭제 헬퍼
 */
function deleteCookie(name: string): void {
  document.cookie = `${name}=; max-age=0; path=/`
}

/**
 * 토큰 저장 (localStorage + 쿠키 둘 다 저장)
 * 페이지 이동 시 자동으로 유지됩니다.
 */
export function setAuthToken(token: string): void {
  try {
    // localStorage에 저장 (JavaScript 접근용)
    localStorage.setItem(TOKEN_KEY, token)
    
    // 쿠키에도 저장 (자동 전송 및 페이지 간 공유용)
    setCookie(COOKIE_NAME, token, COOKIE_MAX_AGE)
    
    console.log('[Auth] 토큰 저장 완료 (localStorage + 쿠키)')
  } catch (error) {
    console.error('[Auth] 토큰 저장 실패:', error)
    throw new Error('토큰 저장에 실패했습니다.')
  }
}

/**
 * 토큰 조회 (localStorage 우선, 없으면 쿠키에서 조회)
 * 페이지 이동 시에도 자동으로 유지됩니다.
 */
export function getAuthToken(): string | null {
  try {
    // localStorage에서 먼저 조회
    let token = localStorage.getItem(TOKEN_KEY)
    
    // localStorage에 없으면 쿠키에서 조회
    if (!token) {
      token = getCookie(COOKIE_NAME)
      // 쿠키에서 찾았으면 localStorage에도 저장 (동기화)
      if (token) {
        localStorage.setItem(TOKEN_KEY, token)
        console.log('[Auth] 쿠키에서 토큰 복원 및 localStorage 동기화')
      }
    }
    
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
 * 토큰 삭제 (localStorage + 쿠키 둘 다 삭제)
 */
export function removeAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    deleteCookie(COOKIE_NAME)
    console.log('[Auth] 토큰 삭제 완료 (localStorage + 쿠키)')
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

