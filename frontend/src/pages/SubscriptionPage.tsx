// frontend/src/pages/SubscriptionPage.tsx

import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAuthToken } from '../lib/auth'

declare global {
    interface Window {
        IMP: any
    }
}

interface MeResponse {
    id: number
    email: string
    name: string
    // 백엔드에서 /api/auth/me에 is_subscribed, next_billing_at까지 내려줄 거라면
    // 여기에 추가해도 됨
    // is_subscribed?: boolean
    // next_billing_at?: string | null
}

// 🔥 백엔드 기본 URL (Vite .env에서 설정 가능)
import { API_BASE_URL } from '@/constants/api'

export default function SubscriptionPage() {
    const navigate = useNavigate()
    const [me, setMe] = useState<MeResponse | null>(null)

    useEffect(() => {
        if (window.IMP) {
            // .env: VITE_PORTONE_MERCHANT_ID=impXXXXXXX (포트원 가맹점 식별코드)
            window.IMP.init(import.meta.env.VITE_PORTONE_MERCHANT_ID)
        }

        const fetchMe = async () => {
            const token = getAuthToken()
            if (!token) return

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                if (res.ok) {
                    const data = await res.json()
                    setMe({
                        id: data.id,
                        email: data.email,
                        name: data.name,
                    })
                }
            } catch (e) {
                console.error('failed to fetch /me', e)
            }
        }

        fetchMe()
    }, [])

    const handleBasicPlanPay = () => {
        const { IMP } = window
        if (!IMP) {
            alert('결제 모듈이 로드되지 않았습니다.')
            return
        }

        if (!me) {
            alert('로그인 정보를 불러오지 못했습니다. 다시 로그인 후 시도해 주세요.')
            return
        }

        // 🔥 정기결제용 customer_uid (유저별로 고정되게)
        const customerUid = `user_${me.id}_${Date.now()}`

        const merchantUid = `basic_${Date.now()}_${Math.random().toString(36).substring(7)}`

        IMP.request_pay(
            {
                // ✅ 이니시스 일반결제 + 정기결제 테스트 채널
                pg: 'kakaopay.TCSUBSCRIP',
                pay_method: 'kakaopay',
                merchant_uid: merchantUid,

                // 🔥 정기결제 핵심: customer_uid
                customer_uid: customerUid,

                name: 'Daily-cam 베이직 플랜 (1개월 구독)',
                amount: 9900, // 백엔드 금액이랑 반드시 맞추기

                buyer_email: me.email,
                buyer_name: me.name,
            },
            async (rsp: any) => {
                if (rsp.success) {
                    try {
                        const res = await fetch(
                            `${API_BASE_URL}/api/payments/subscribe/basic/confirm`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${getAuthToken()}`,
                                },
                                body: JSON.stringify({
                                    imp_uid: rsp.imp_uid,
                                    merchant_uid: rsp.merchant_uid,
                                    // 🔥 백엔드에서 DB에 저장할 customer_uid 같이 전송
                                    customer_uid: customerUid,
                                }),
                            }
                        )

                        if (!res.ok) {
                            const err = await res.json().catch(() => ({}))
                            console.error('confirm error:', err)
                            throw new Error('서버 검증 실패')
                        }

                        // ✅ 사이드바에 "구독 상태 바뀜" 알리기
                        window.dispatchEvent(new Event('subscriptionChanged'))

                        alert('베이직 플랜 월 정기구독이 시작되었습니다.')

                        // 프로필 완성 여부 확인 후 리다이렉트
                        try {
                            const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
                                headers: {
                                    Authorization: `Bearer ${getAuthToken()}`,
                                },
                            })
                            if (meRes.ok) {
                                const userData = await meRes.json()
                                // 프로필이 완성되지 않았으면 프로필 설정 페이지로
                                if (!userData.profile_completed) {
                                    navigate('/profile-setup')
                                } else {
                                    // 이미 프로필이 있으면 홈으로
                                    navigate('/')
                                }
                            } else {
                                // 사용자 정보를 가져올 수 없으면 기본적으로 프로필 설정으로
                                navigate('/profile-setup')
                            }
                        } catch (e) {
                            console.error('프로필 확인 실패:', e)
                            navigate('/profile-setup')
                        }
                    } catch (e) {
                        console.error(e)
                        alert(
                            '결제는 완료되었지만 서버 처리 중 오류가 발생했습니다.\n관리자에게 문의해 주세요.'
                        )
                    }
                } else {
                    alert(`결제에 실패했습니다: ${rsp.error_msg}`)
                }
            }
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-10">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">구독 플랜</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Daily-cam 베이직 플랜을 구독하고 AI 분석 기능을 이용해 보세요.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        ← 돌아가기
                    </button>
                </div>

                {/* 베이직 플랜 카드 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">베이직 플랜</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                한 가정, 한 대의 카메라 기준 · 월 정액 구독
                            </p>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-extrabold text-gray-900">
                            월 9,900원
                        </span>
                        <span className="text-xs text-gray-400">VAT 포함</span>
                    </div>

                    <ul className="space-y-2 text-sm text-gray-700 mb-6">
                        <li>• 하루 24시간 영상 AI 발달·안전 분석</li>
                        <li>• 대시보드, 발달 리포트, 안전 리포트 전체 기능</li>
                        <li>• 클립 하이라이트 자동 생성 (일일 제한 내)</li>
                        <li>• 분석 데이터 30일 보관</li>
                    </ul>

                    <div className="bg-gray-50 rounded-lg p-3 mb-6 text-xs text-gray-500 leading-relaxed">
                        • 첫 결제 후 바로 구독이 시작되며, 등록된 카드로 매월 자동 결제됩니다.
                        <br />
                        • 언제든 구독을 해지하실 수 있으며, 해지 시 다음 달부터 결제가 중단됩니다.
                    </div>

                    <button
                        onClick={handleBasicPlanPay}
                        className="w-full py-3 rounded-lg bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors"
                    >
                        베이직 플랜 월 정기구독 시작하기
                    </button>
                </div>
            </div>
        </div>
    )
}