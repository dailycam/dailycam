import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getAuthToken } from '../lib/auth'

export default function ProtectedRoute() {
    const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const checkSubscription = async () => {
            const token = getAuthToken()

            if (!token) {
                setIsLoading(false)
                return
            }

            try {
                const response = await fetch('http://localhost:8000/api/auth/me', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (response.ok) {
                    const userInfo = await response.json()
                    setIsSubscribed(Boolean(userInfo.is_subscribed))
                } else {
                    setIsSubscribed(false)
                }
            } catch (error) {
                console.error('구독 상태 확인 오류:', error)
                setIsSubscribed(false)
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
                    <p className="text-gray-700 text-lg">로딩 중...</p>
                </div>
            </div>
        )
    }

    if (!isSubscribed) {
        return <Navigate to="/subscription" replace />
    }

    return <Outlet />
}
