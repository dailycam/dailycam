import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getAuthToken, removeAuthToken } from '../lib/auth'
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserInfo = async (): Promise<void> => {
    const token = getAuthToken()

    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser({
          ...data,
          id: data.user_id || data.id,
          is_subscribed: Boolean(data.is_subscribed),
        })
      } else if (response.status === 401) {
        // 토큰 만료 또는 유효하지 않음
        removeAuthToken()
        setUser(null)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('[AuthContext] 사용자 정보 가져오기 오류:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async (): Promise<void> => {
    setIsLoading(true)
    await fetchUserInfo()
  }

  const logout = async (): Promise<void> => {
    const token = getAuthToken()

    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout-with-token`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (error) {
        console.error('[AuthContext] 로그아웃 오류:', error)
      }
    }

    removeAuthToken()
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

