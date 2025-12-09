import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAuthToken, removeAuthToken } from '../lib/auth'
import { API_BASE_URL } from '@/constants/api'

export default function ProtectedRoute() {
    const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [needsLogin, setNeedsLogin] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const checkSubscription = async () => {
            const token = getAuthToken()

            if (!token) {
                console.log('[ProtectedRoute] 토큰 없음 → 로그인 필요')
                setNeedsLogin(true)
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
                    const userInfo = await response.json()
                    const subscribed = Boolean(userInfo.is_subscribed)
                    setIsSubscribed(subscribed)
                    console.log('[ProtectedRoute] 인증 성공, 구독 상태:', subscribed)
                } else if (response.status === 401) {
                    // 토큰 만료 또는 유효하지 않음
                    console.log('[ProtectedRoute] 토큰 만료 → 로그인 필요')
                    removeAuthToken() // 만료된 토큰 제거
                    setNeedsLogin(true)
                } else {
                    console.log('[ProtectedRoute] 인증 실패 (구독 필요)')
                    setIsSubscribed(false)
                }
            } catch (error) {
                console.error('[ProtectedRoute] 구독 상태 확인 오류:', error)
                // 네트워크 오류의 경우 일단 접근 허용 (오프라인 대응)
                setIsSubscribed(true)
            } finally {
                setIsLoading(false)
            }
        }

        checkSubscription()
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-700 text-lg">인증 확인 중...</p>
                </div>
            </div>
        )
    }

    // 토큰이 없거나 만료된 경우 → 로그인 페이지로 (현재 경로 저장)
    if (needsLogin) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />
    }

    // 토큰은 있지만 구독하지 않은 경우 → 구독 페이지로
    if (!isSubscribed) {
        return <Navigate to="/subscription" replace />
    }

    return <Outlet />
}
