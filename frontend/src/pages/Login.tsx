export default function Login() {
    const handleGoogleLogin = () => {
        // 백엔드 Google OAuth 엔드포인트로 리다이렉트
        window.location.href = 'http://localhost:8000/api/auth/google/login'
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            <div className="absolute inset-0 bg-black opacity-20"></div>

            <div className="relative z-10 max-w-md w-full mx-4">
                {/* 로그인 카드 */}
                <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
                    {/* 로고 */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">DailyCam</h1>
                        <p className="text-gray-600">AI 기반 스마트 모니터링</p>
                    </div>

                    {/* 환영 메시지 */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">환영합니다!</h2>
                        <p className="text-gray-600">Google 계정으로 간편하게 시작하세요</p>
                    </div>

                    {/* Google 로그인 버튼 */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 group"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
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
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span>Google로 계속하기</span>
                    </button>

                    {/* 추가 정보 */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            로그인하면{' '}
                            <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
                                서비스 약관
                            </a>
                            {' '}및{' '}
                            <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
                                개인정보 처리방침
                            </a>
                            에 동의하게 됩니다.
                        </p>
                    </div>
                </div>

                {/* 하단 장식 */}
                <div className="mt-8 text-center">
                    <p className="text-white/80 text-sm">
                        © 2024 DailyCam. All rights reserved.
                    </p>
                </div>
            </div>

            {/* 배경 장식 */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            </div>
        </div>
    )
}
