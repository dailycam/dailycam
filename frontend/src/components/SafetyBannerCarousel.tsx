import { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { ChevronLeft, ChevronRight, ShieldCheck, Video, FileBarChart, MapPin, CheckSquare, Clock, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Link } from "react-router-dom";

export function SafetyBannerCarousel() {
  const sliderRef = useRef<Slider>(null);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4500,
    arrows: false,
    pauseOnHover: true,
  };

  return (
    <div className="relative w-full">
      <Slider ref={sliderRef} {...settings}>
        {/* Slide 1: 기존 Hero Section - 아이의 안전, AI가 지켜드립니다 */}
        <div>
          <section className="relative bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50 h-[600px] flex items-center">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  아이의 안전,
                  <br />
                  <span className="text-primary-600">AI가 지켜드립니다</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  기존 홈캠을 AI 안전 모니터링 시스템으로 업그레이드하세요.
                  <br />
                  Gemini가 실시간으로 위험을 감지하고 즉시 알려드립니다.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link
                    to="/dashboard"
                    className="rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-all"
                  >
                    지금 시작하기
                  </Link>
                  <a
                    href="#features"
                    className="flex items-center gap-2 text-base font-semibold leading-6 text-gray-900 hover:text-primary-600 transition-colors"
                  >
                    더 알아보기
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Slide 2: 아이곁에 - 기존 홈캠 연동 */}
        <div>
          <div className="relative h-[600px] bg-gradient-to-br from-blue-400 via-indigo-300 to-purple-300 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-24 h-24 bg-white/30 rounded-full" />
            <div className="absolute bottom-32 right-20 w-32 h-32 bg-white/20 rounded-full" />
            <div className="absolute top-1/2 right-40 w-16 h-16 bg-white/40 rounded-full" />

            <div className="container mx-auto px-8 h-full flex items-center">
              <div className="grid md:grid-cols-2 gap-12 items-center w-full">
                <div className="z-10">
                  <div className="inline-block px-5 py-2 bg-white/90 text-indigo-600 rounded-full mb-6">
                    기존 홈캠 연동
                  </div>
                  <h1 className="text-white mb-6 text-4xl font-bold sm:text-6xl">
                    아이곁에, <br />
                    AI가 우리 아이를 지킵니다
                  </h1>
                  <p className="text-white/90 mb-8 text-lg">
                    기존에 사용하시던 홈캠을 그대로 활용하세요. <br />
                    3분 안에 간편하게 연동하여 AI 안전 분석 서비스를 시작할 수 있습니다.
                  </p>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center rounded-lg bg-white text-indigo-600 hover:bg-gray-100 px-6 py-3 text-base font-semibold transition-all"
                  >
                    지금 시작하기
                  </Link>
                </div>

                <div className="relative z-10 hidden md:block">
                  {/* Mock dashboard */}
                  <div className="relative">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 transform rotate-2">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-900">아이곁에</h3>
                        <ShieldCheck className="text-indigo-600" size={24} />
                      </div>
                      <ImageWithFallback
                        src="https://images.unsplash.com/photo-1503284116362-30c49f508156?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWJ5JTIwY3Jhd2xpbmclMjBob21lfGVufDF8fHx8MTc2Mjg1MDc3MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                        alt="아이 모니터링"
                        className="w-full h-64 object-cover rounded-lg mb-4"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-green-600 mb-1 flex items-center gap-1">
                            <ShieldCheck size={16} />
                            세이프존
                          </div>
                          <div className="text-gray-900">안전</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-blue-600 mb-1 flex items-center gap-1">
                            <Clock size={16} />
                            활동 시간
                          </div>
                          <div className="text-gray-900">2시간 15분</div>
                        </div>
                      </div>
                    </div>

                    {/* Floating notification */}
                    <div className="absolute -left-8 top-20 bg-indigo-600 text-white p-4 rounded-lg shadow-xl max-w-xs transform -rotate-3">
                      <div className="flex items-start gap-3">
                        <FileBarChart className="text-white flex-shrink-0" size={20} />
                        <div>
                          <div className="mb-1">홈캠 연동 완료</div>
                          <div className="text-indigo-100 text-sm">AI 분석이 시작되었습니다.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 2: 일일 안전 리포트 */}
        <div>
          <div className="relative h-[600px] bg-gradient-to-br from-emerald-400 via-teal-300 to-cyan-300 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-20 right-20 w-20 h-20 bg-white/30 rounded-full" />
            <div className="absolute bottom-40 left-32 w-24 h-24 bg-white/20 rounded-full" />
            <div className="absolute top-1/3 left-20 w-16 h-16 bg-white/25 rounded-full" />

            <div className="container mx-auto px-8 h-full flex items-center relative z-10">
              <div className="grid md:grid-cols-2 gap-12 items-center w-full">
                <div>
                  <div className="inline-block px-5 py-2 bg-white text-emerald-600 rounded-full mb-6">
                    AI 분석 리포트
                  </div>
                  <h1 className="text-white mb-6 text-4xl font-bold sm:text-6xl">
                    하루를 요약한 <br />
                    안전 리포트
                  </h1>
                  <p className="text-white/90 mb-8 text-lg">
                    세이프존 침범, 넘어진 횟수, 위험 요소 등 <br />
                    수치화된 객관적 데이터로 우리 아이의 하루를 한눈에 확인하세요.
                  </p>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center rounded-lg bg-white text-emerald-600 hover:bg-gray-100 px-6 py-3 text-base font-semibold transition-all"
                  >
                    자세히 보기
                  </Link>
                </div>

                <div className="relative hidden md:block">
                  {/* Daily report mockup */}
                  <div className="relative">
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileBarChart className="text-white" size={20} />
                            <span className="text-white">오늘의 안전 리포트</span>
                          </div>
                          <span className="text-white text-sm">2024.11.12</span>
                        </div>
                      </div>
                      <ImageWithFallback
                        src="https://images.unsplash.com/photo-1543346242-2b8e41fb91ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWJ5JTIwcm9vbSUyMG51cnNlcnl8ZW58MXx8fHwxNzYyOTA1ODM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                        alt="아기방"
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4 space-y-3">
                        <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                          <div className="flex items-start gap-3">
                            <MapPin className="text-amber-600 flex-shrink-0 mt-1" size={18} />
                            <div>
                              <div className="text-gray-900 mb-1">세이프존 침범</div>
                              <div className="text-gray-600 text-sm">오늘 3번 세이프존을 벗어났습니다</div>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                          <div className="flex items-start gap-3">
                            <CheckSquare className="text-orange-600 flex-shrink-0 mt-1" size={18} />
                            <div>
                              <div className="text-gray-900 mb-1">넘어짐 감지</div>
                              <div className="text-gray-600 text-sm">거실에서 2회 넘어짐이 감지되었습니다</div>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="text-blue-600 flex-shrink-0 mt-1" size={18} />
                            <div>
                              <div className="text-gray-900 mb-1">위험 요소 발견</div>
                              <div className="text-gray-600 text-sm">모서리 가드 설치가 필요합니다</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating stat */}
                    <div className="absolute -right-6 top-32 bg-white text-emerald-600 p-6 rounded-full shadow-xl border-4 border-emerald-200">
                      <div className="text-center">
                        <div className="text-3xl mb-1">5</div>
                        <div className="text-sm">건 감지</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 3: 하이라이트 영상 + 히트맵 */}
        <div>
          <div className="relative h-[600px] bg-gradient-to-br from-rose-400 via-pink-300 to-purple-300 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-32 left-16 w-20 h-20 bg-white/30 rounded-full" />
            <div className="absolute bottom-20 right-1/4 w-12 h-12 bg-white/40 rounded-full" />
            <div className="absolute top-20 right-32 w-24 h-24 bg-white/25 rounded-full" />

            <div className="container mx-auto px-8 h-full flex items-center relative z-10">
              <div className="grid md:grid-cols-2 gap-12 items-center w-full">
                <div>
                  <div className="inline-block px-5 py-2 bg-white text-rose-600 rounded-full mb-6">
                    스마트 분석
                  </div>
                  <h1 className="text-white mb-6 text-4xl font-bold sm:text-6xl">
                    중요한 순간만 <br />
                    자동으로 편집
                  </h1>
                  <p className="text-white/90 mb-8 text-lg">
                    긴 영상을 전부 볼 필요 없이 위험 순간만 하이라이트로 자동 편집. <br />
                    공간/시간 히트맵으로 위험 구간을 한눈에 파악하세요.
                  </p>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center rounded-lg bg-white text-rose-600 hover:bg-gray-100 px-6 py-3 text-base font-semibold transition-all"
                  >
                    자세히 보기
                  </Link>
                </div>

                <div className="relative hidden md:block">
                  {/* Video highlight mockup */}
                  <div className="relative">
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                      <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Video className="text-white" size={20} />
                          <span className="text-white">하이라이트 영상</span>
                        </div>
                        <span className="text-white text-sm">4개 클립</span>
                      </div>
                      <ImageWithFallback
                        src="https://images.unsplash.com/photo-1725297952113-36be1c7cefb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b2RkbGVyJTIwcGxheWluZyUyMHNhZmVseXxlbnwxfHx8fDE3NjI5MDU4MzR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                        alt="아이 활동"
                        className="w-full h-64 object-cover"
                      />
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <MapPin className="text-red-600" size={16} />
                            <span className="text-gray-900">세이프존 침범</span>
                          </div>
                          <span className="text-red-600">14:23</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Video className="text-orange-600" size={16} />
                            <span className="text-gray-900">넘어짐 감지</span>
                          </div>
                          <span className="text-orange-600">15:47</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Video className="text-yellow-600" size={16} />
                            <span className="text-gray-900">계단 근처 접근</span>
                          </div>
                          <span className="text-yellow-600">16:35</span>
                        </div>
                      </div>

                      {/* Heatmap indicator */}
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-t">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <MapPin size={16} className="text-purple-600" />
                          <span>공간/시간 히트맵으로 위험 구간 분석</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 4: 즉시 실행 체크리스트 */}
        <div>
          <div className="relative h-[600px] bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-50 overflow-hidden">
            {/* Background image with overlay */}
            <div className="absolute inset-0 right-0 w-1/2 md:w-2/5">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1541545705343-80ecdec063ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmZhbnQlMjBzbGVlcCUyMG1vbml0b3J8ZW58MXx8fHwxNzYyOTA1ODM1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="아기 안전"
                className="w-full h-full object-cover opacity-50"
              />
            </div>

            {/* Decorative circles */}
            <div className="absolute top-32 left-16 w-20 h-20 bg-violet-300/40 rounded-full" />
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-purple-300/40 rounded-full" />

            <div className="container mx-auto px-8 h-full flex items-center relative z-10">
              <div className="grid md:grid-cols-2 gap-12 items-center w-full">
                <div>
                  <div className="inline-block px-5 py-2 bg-gradient-to-r from-violet-400 to-purple-400 text-white rounded-full mb-6">
                    맞춤형 가이드
                  </div>
                  <h1 className="text-gray-900 mb-6 text-4xl font-bold sm:text-6xl">
                    AI가 추천하는 <br />
                    즉시 실행 체크리스트
                  </h1>
                  <p className="text-gray-700 mb-8 text-lg">
                    분석 결과를 바탕으로 우선순위가 높은 안전 조치를 추천해드립니다. <br />
                    모서리 가드 설치, 위험 물건 제거 등 실행 가능한 가이드를 제공합니다.
                  </p>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 px-6 py-3 text-base font-semibold transition-all"
                  >
                    시작하기
                  </Link>
                </div>

                <div className="relative hidden md:flex justify-end">
                  {/* Checklist cards */}
                  <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
                    <div className="flex items-center gap-2 mb-6">
                      <CheckSquare className="text-violet-600" size={24} />
                      <h3 className="text-gray-900">오늘의 체크리스트</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
                        <div className="w-5 h-5 rounded border-2 border-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-gray-900 mb-1">거실 모서리에 가드 추가</div>
                          <div className="text-sm text-red-600">우선순위: 높음</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                        <div className="w-5 h-5 rounded border-2 border-orange-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-gray-900 mb-1">계단 앞 안전문 설치 확인</div>
                          <div className="text-sm text-orange-600">우선순위: 높음</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                        <div className="w-5 h-5 rounded border-2 border-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-gray-900 mb-1">TV 고정 장치 재점검</div>
                          <div className="text-sm text-yellow-600">우선순위: 중간</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <div className="w-5 h-5 rounded border-2 border-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-gray-900 mb-1">세이프존 범위 재조정</div>
                          <div className="text-sm text-blue-600">우선순위: 중간</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Slider>

      {/* Navigation buttons */}
      <button
        onClick={() => sliderRef.current?.slickPrev()}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="text-gray-800" size={24} />
      </button>
      <button
        onClick={() => sliderRef.current?.slickNext()}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="text-gray-800" size={24} />
      </button>
    </div>
  );
}

