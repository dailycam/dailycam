import { Camera } from 'lucide-react'

export default function Login() {
    const handleGoogleLogin = () => {
        // 백엔드 Google OAuth 엔드포인트로 리다이렉트
        window.location.href = 'http://localhost:8000/api/auth/google/login'
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-primary-50/30 to-cyan-50 p-4 relative">
            {/* 배경 장식 (subtle) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-200/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-md w-full">
                {/* 로그인 카드 - Glassmorphism */}
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/50 p-10">

                    {/* 로고 */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-cyan-100 rounded-full flex items-center justify-center shadow-soft">
                            <Camera className="w-10 h-10 text-primary-600" strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* 텍스트 영역 */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">DailyCam</h1>
                        <p className="text-gray-500 text-base leading-relaxed">
                            엄마 아빠의 눈이 되어줄게요.<br />
                            <span className="text-primary-600 font-semibold">AI 안심 모니터링</span>을 시작해보세요.
                        </p>
                    </div>

                    {/* Google 로그인 버튼 */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-medium py-4 px-6 rounded-2xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Google 계정으로 계속하기
                    </button>

                    {/* 추가 정보 */}
                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-400">
                            로그인하면{' '}
                            <a href="#" className="text-primary-600 hover:text-primary-700 underline">
                                서비스 약관
                            </a>
                            {' '}및{' '}
                            <a href="#" className="text-primary-600 hover:text-primary-700 underline">
                                개인정보 처리방침
                            </a>
                            에 동의하게 됩니다.
                        </p>
                    </div>
                </div>

                {/* 하단 카피라이트 */}
                <div className="mt-8 text-center">
                    <p className="text-gray-400/80 text-xs">
                        © 2025 DailyCam. 아이를 위한 따뜻한 기술.
                    </p>
                </div>
            </div>
        </div>
    )
}
