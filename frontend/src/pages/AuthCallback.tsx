import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setAuthToken } from '../lib/auth'

export default function AuthCallback() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [status, setStatus] = useState('로그인 처리 중...')

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get('token')

            if (!token) {
                console.warn('[AuthCallback] 토큰이 없습니다.')
                navigate('/login', { replace: true })
                return
            }

            try {
                // 1. 토큰 저장
                setAuthToken(token)
                console.log('[AuthCallback] 토큰 저장 완료')

                // 2. 사용자 정보 조회
                setStatus('사용자 정보 확인 중...')
                const response = await fetch('http://localhost:8000/api/auth/me', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    throw new Error('사용자 정보를 가져올 수 없습니다')
                }

                const userInfo = await response.json()
                console.log('[AuthCallback] 사용자 정보:', userInfo)

                // 3. 구독 상태 확인
                const isSubscribed = Boolean(userInfo.is_subscribed)

                // 4. 프로필 완성 여부 확인 (아이 이름, 생년월일)
                const profileCompleted = Boolean(userInfo.child_name && userInfo.child_birthdate)

                // 5. 리다이렉트 로직
                if (!isSubscribed) {
                    // 미구독 회원 -> 구독 페이지
                    console.log('[AuthCallback] 미구독 회원 - 구독 페이지로 이동')
                    navigate('/subscription', { replace: true })
                } else if (!profileCompleted) {
                    // 구독 회원이지만 프로필 미완성 -> 프로필 등록 페이지
                    console.log('[AuthCallback] 프로필 미완성 - 프로필 등록 페이지로 이동')
                    navigate('/profile-setup', { replace: true })
                } else {
                    // 구독 회원 + 프로필 완성 -> 대시보드로 이동
                    console.log('[AuthCallback] 구독 회원 + 프로필 완성 - 대시보드로 이동')

                    // 상태 업데이트
                    setStatus('대시보드로 이동 중...')

                    // 대시보드로 즉시 이동
                    navigate('/dashboard', { replace: true })

                    // AI 콘텐츠 미리 로드 (대시보드 데이터 로드 후 실행되도록 약간 지연)
                    setTimeout(() => {
                        console.log('[AuthCallback] AI 콘텐츠 미리 로드 시작')
                        Promise.all([
                            fetch('http://localhost:8000/api/content/recommended-videos', {
                                headers: { Authorization: `Bearer ${token}` }
                            }),
                            fetch('http://localhost:8000/api/content/recommended-blogs', {
                                headers: { Authorization: `Bearer ${token}` }
                            }),
                            fetch('http://localhost:8000/api/content/recommended-news', {
                                headers: { Authorization: `Bearer ${token}` }
                            }),
                            fetch('http://localhost:8000/api/content/trending', {
                                headers: { Authorization: `Bearer ${token}` }
                            })
                        ]).then(() => {
                            console.log('[AuthCallback] AI 콘텐츠 미리 로드 완료')
                        }).catch(err => {
                            console.warn('[AuthCallback] AI 콘텐츠 미리 로드 실패 (무시):', err)
                        })
                    }, 500) // 500ms 지연
                }
            } catch (error) {
                console.error('[AuthCallback] 오류 발생:', error)
                navigate('/login', { replace: true })
            }
        }

        handleCallback()
    }, [searchParams, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-700 text-lg">{status}</p>
            </div>
        </div>
    )
}
