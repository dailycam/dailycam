import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AuthCallback() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    useEffect(() => {
        const token = searchParams.get('token')

        if (token) {
            // 토큰을 localStorage에 저장
            localStorage.setItem('access_token', token)

            // 대시보드로 리다이렉트
            navigate('/dashboard')
        } else {
            // 토큰이 없으면 로그인 페이지로
            navigate('/login')
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
