import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
    const { user, isLoading, isSubscribed } = useAuth()
    const location = useLocation()

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

    // 사용자 정보가 없는 경우 → 로그인 페이지로
    // (httpOnly Cookie 인증이므로 user 존재 여부로 판단)
    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />
    }

    // 구독하지 않은 경우 → 구독 페이지로
    if (!isSubscribed) {
        return <Navigate to="/subscription" replace />
    }

    return <Outlet />
}
