import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setAuthToken } from '../lib/auth'

export default function AuthCallback() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    useEffect(() => {
        const token = searchParams.get('token')

        if (token) {
            // 토큰을 저장 (공통 유틸리티 사용)
            try {
                setAuthToken(token)
                console.log('[AuthCallback] 토큰 저장 완료, 대시보드로 이동')
                // 대시보드로 리다이렉트
                navigate('/dashboard', { replace: true })
            } catch (error) {
                console.error('[AuthCallback] 토큰 저장 실패:', error)
                navigate('/login', { replace: true })
            }
        } else {
            // 토큰이 없으면 로그인 페이지로
            console.warn('[AuthCallback] 토큰이 없습니다.')
            navigate('/login', { replace: true })
        }
    }, [searchParams, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-700 text-lg">로그인 처리 중...</p>
            </div>
        </div>
    )
}
