import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '@/constants/api'

const IS_DEV = import.meta.env.DEV

function devLog(...args: any[]): void {
  if (IS_DEV) {
    console.log(...args)
  }
}

export default function AuthCallback() {
    const navigate = useNavigate()
    const { refreshUser } = useAuth()
    const [status, setStatus] = useState('로그인 처리 중...')

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // httpOnly Cookie가 이미 설정되었으므로 토큰 처리 불필요
                devLog('[AuthCallback] httpOnly Cookie로 인증 완료')

                // 1. 사용자 정보 조회
                setStatus('사용자 정보 확인 중...')
                await refreshUser()
                
                // Context 업데이트 대기 (최대 1초)
                let retries = 0
                let currentUserInfo = null
                while (retries < 10) {
                    await new Promise(resolve => setTimeout(resolve, 100))
                    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                        credentials: 'include',
                    })
                    if (response.ok) {
                        currentUserInfo = await response.json()
                        break
                    }
                    retries++
                }
                
                if (!currentUserInfo) {
                    throw new Error('사용자 정보를 가져올 수 없습니다')
                }
                
                devLog('[AuthCallback] 사용자 정보:', currentUserInfo)

                // 2. 구독 상태 확인
                const isSubscribed = Boolean(currentUserInfo.is_subscribed)

                // 3. 프로필 완성 여부 확인 (아이 이름, 생년월일)
                const profileCompleted = Boolean(currentUserInfo.child_name && currentUserInfo.child_birthdate)

                // 4. 리다이렉트 로직
                if (!isSubscribed) {
                    devLog('[AuthCallback] 미구독 회원 - 구독 페이지로 이동')
                    navigate('/subscription', { replace: true })
                } else if (!profileCompleted) {
                    devLog('[AuthCallback] 프로필 미완성 - 프로필 등록 페이지로 이동')
                    navigate('/profile-setup', { replace: true })
                } else {
                    devLog('[AuthCallback] 구독 회원 + 프로필 완성 - 대시보드로 이동')

                    setStatus('대시보드로 이동 중...')
                    navigate('/dashboard', { replace: true })

                    // AI 콘텐츠 미리 로드 (대시보드 데이터 로드 후 실행되도록 약간 지연)
                    setTimeout(() => {
                        devLog('[AuthCallback] AI 콘텐츠 미리 로드 시작')
                        Promise.all([
                            fetch(`${API_BASE_URL}/api/content/recommended-videos`, {
                                credentials: 'include'
                            }),
                            fetch(`${API_BASE_URL}/api/content/recommended-blogs`, {
                                credentials: 'include'
                            }),
                            fetch(`${API_BASE_URL}/api/content/recommended-news`, {
                                credentials: 'include'
                            }),
                            fetch(`${API_BASE_URL}/api/content/trending`, {
                                credentials: 'include'
                            })
                        ]).then(() => {
                            devLog('[AuthCallback] AI 콘텐츠 미리 로드 완료')
                        }).catch(err => {
                            console.warn('[AuthCallback] AI 콘텐츠 미리 로드 실패 (무시):', err)
                        })
                    }, 500)
                }
            } catch (error) {
                console.error('[AuthCallback] 오류 발생:', error)
                navigate('/login', { replace: true })
            }
        }

        handleCallback()
    }, [navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-700 text-lg">{status}</p>
            </div>
        </div>
    )
}
