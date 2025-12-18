import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { removeAuthToken } from '../lib/auth'
import { API_BASE_URL } from '@/constants/api'

export interface UserInfo {
  id: number
  user_id?: number
  email: string
  name: string
  picture: string
  created_at: string
  is_subscribed?: boolean | number
  subscription_plan?: string | null
  next_billing_at?: string | null
  child_name?: string | null
  child_birthdate?: string | null
  phone?: string | null
  has_billing_key?: boolean
}

interface AuthContextType {
  user: UserInfo | null
  isLoading: boolean
  isAuthenticated: boolean
  isSubscribed: boolean
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

// 개발 환경에서만 로그 출력
const IS_DEV = import.meta.env.DEV
const devLog = (...args: any[]) => {
  if (IS_DEV) console.log(...args)
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserInfo = async (isRetry: boolean = false): Promise<void> => {
    // httpOnly Cookie를 사용하므로 토큰 확인 불필요
    // 백엔드가 자동으로 Cookie에서 토큰을 읽음
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: 'include',  // Cookie 자동 포함
      })

      if (response.ok) {
        const data = await response.json()
        setUser({
          ...data,
          id: data.user_id || data.id,
          is_subscribed: Boolean(data.is_subscribed),
        })
      } else if (response.status === 401 && !isRetry) {
        // Access Token 만료 - Refresh Token으로 갱신 시도 (최초 1회만)
        devLog('[AuthContext] Access Token 만료, Refresh 시도...')
        const refreshed = await refreshAccessToken()
        
        if (refreshed) {
          // 토큰 갱신 성공, 다시 사용자 정보 조회 (재시도 플래그 설정)
          devLog('[AuthContext] 토큰 갱신 성공, 사용자 정보 재조회')
          await fetchUserInfo(true)  // isRetry = true로 재시도
        } else {
          // Refresh Token도 만료 - 로그아웃
          devLog('[AuthContext] Refresh Token 만료, 로그아웃')
          removeAuthToken()
          setUser(null)
        }
      } else {
        // 401이지만 이미 재시도했거나, 다른 에러
        devLog('[AuthContext] 인증 실패 또는 재시도 실패')
        removeAuthToken()
        setUser(null)
      }
    } catch (error) {
      console.error('[AuthContext] 사용자 정보 가져오기 오류:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',  // Cookie 자동 포함
      })

      if (response.ok) {
        devLog('[AuthContext] Access Token 갱신 성공')
        return true
      } else {
        devLog('[AuthContext] Refresh Token 만료 또는 무효')
        return false
      }
    } catch (error) {
      console.error('[AuthContext] 토큰 갱신 오류:', error)
      return false
    }
  }

  const refreshUser = async (): Promise<void> => {
    setIsLoading(true)
    await fetchUserInfo()
  }

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout-with-token`, {
        method: 'POST',
        credentials: 'include',  // Cookie 자동 포함
      })
    } catch (error) {
      console.error('[AuthContext] 로그아웃 오류:', error)
    }

    removeAuthToken()  // localStorage 정리
    setUser(null)
    // navigate는 컴포넌트에서 처리
    window.location.href = '/'
  }

  // 초기 로드 시 사용자 정보 가져오기
  useEffect(() => {
    fetchUserInfo()
  }, [])

  // 구독 변경 이벤트 리스너
  useEffect(() => {
    const handleSubscriptionChanged = () => {
      refreshUser()
    }

    window.addEventListener('subscriptionChanged', handleSubscriptionChanged)
    return () => {
      window.removeEventListener('subscriptionChanged', handleSubscriptionChanged)
    }
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSubscribed: Boolean(user?.is_subscribed),
    refreshUser,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

