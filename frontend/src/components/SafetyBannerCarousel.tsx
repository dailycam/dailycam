import { useRef, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { ShieldCheck, Video, FileBarChart, MapPin, CheckSquare, ArrowRight, Sparkles, PlayCircle, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Link } from "react-router-dom";

export function SafetyBannerCarousel() {
  const sliderRef = useRef<Slider>(null);
  const [isHovered, setIsHovered] = useState(false);

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
    dotsClass: `slick-dots !bottom-6 transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`,
    customPaging: () => (
      <div className="w-3 h-3 rounded-full bg-gray-400 hover:bg-gray-600 transition-all duration-300 cursor-pointer" />
    ),
  };

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Slider ref={sliderRef} {...settings} key="banner-v3">
        {/* Slide 1: 종합 소개 */}
        <div>
          <section className="relative bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50 h-[600px] flex items-center overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-20 right-20 w-32 h-32 bg-primary-200/30 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-20 w-40 h-40 bg-blue-200/30 rounded-full blur-3xl" />

            <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full relative z-10">
              <div className="mx-auto max-w-4xl">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-4">
                    우리 아이의 하루를
                    <br />
                    <span className="text-primary-600 bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">한눈에 확인하세요</span>
                  </h1>
                  <p className="text-lg leading-7 text-gray-600 mb-2">
                    홈캠 하나로 <span className="font-bold text-gray-900">안전 · 발달 · 추억</span>까지
                  </p>
                  <p className="text-sm text-gray-500">
                    AI가 분석하는 우리 아이 성장 리포트
                  </p>
                </div>

                {/* Key Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center mb-4">
                      <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-base">AI 위험 감지</h3>
                    <p className="text-sm text-gray-600">안전 리포트 제공</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center mb-4">
                      <FileBarChart className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-base">성장 발달 분석</h3>
                    <p className="text-sm text-gray-600">발달 마일스톤 기록</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                      <Video className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-base">주요 순간 기록</h3>
                    <p className="text-sm text-gray-600">AI 타임라인 제공</p>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                  <Link
                    to="/login"
                    className="w-full sm:w-auto group rounded-lg bg-primary-600 px-10 py-4 text-lg font-bold text-white shadow-md hover:bg-primary-500 transition-all hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                  >
                    지금 시작하기
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <a
                    href="#features"
                    onClick={(e) => {
                      e.preventDefault()
                      const element = document.querySelector('#features')
                      if (element) {
                        const navbarHeight = 64
                        const elementPosition = element.getBoundingClientRect().top
                        const offsetPosition = elementPosition + window.pageYOffset - navbarHeight

                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        })
                      }
                    }}
                    className="w-full sm:w-auto text-base font-semibold text-gray-700 hover:text-primary-600 transition-colors flex items-center justify-center gap-2 px-6"
                  >
                    더 알아보기
                    <ChevronRight className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Slide 2: 안전 모니터링 */}
        <div>
          <div className="relative h-[600px] bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-20 right-20 w-20 h-20 bg-emerald-200/30 rounded-full" />
            <div className="absolute bottom-40 left-32 w-24 h-24 bg-teal-200/20 rounded-full" />
            <div className="absolute top-1/3 left-20 w-16 h-16 bg-cyan-200/25 rounded-full" />

            <div className="container mx-auto px-8 h-full flex items-center justify-center relative z-10 py-10">
              <div className="grid md:grid-cols-2 gap-12 items-center w-full">
                <div>
                  <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full mb-4 text-sm font-semibold">
                    🛡️ AI 안전 리포트
                  </div>
                  <h1 className="text-gray-900 mb-4 text-3xl font-bold sm:text-5xl">
                    일하는 동안에도 <br />
                    마음은 편안하게
                  </h1>
                  <p className="text-gray-600 mb-3 text-base">
                    AI가 <span className="font-bold text-gray-900">위험 상황</span>을 감지하여 기록합니다
                  </p>
                  <p className="text-gray-600 mb-6 text-sm">
                    낙상, 충돌, 끼임 등 안전사고 유형별로
                    <br />
                    일일 리포트를 상세하게 분석해드립니다.
                  </p>
                  <Link
                    to="/safety-report"
                    className="inline-flex items-center gap-2 justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 text-base font-bold transition-all shadow-lg hover:shadow-xl"
                  >
                    안전 리포트 체험하기
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="relative hidden md:block">
                  {/* Safety report mockup */}
                  <div className="relative">
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="text-white" size={20} />
                            <span className="text-white">안전 모니터링</span>
                          </div>
                          <span className="text-white text-sm bg-white/20 px-2 py-1 rounded-full">분석 중</span>
                        </div>
                      </div>
                      <ImageWithFallback
                        src="/안전배너사진2.png"
                        alt="아기방"
                        className="w-full h-48 object-cover object-[50%_75%]"
                      />
                      <div className="grid grid-cols-2 gap-3 p-4">
                        <div className="bg-red-50 p-3 rounded-lg">
                          <div className="text-red-600 mb-1 flex items-center gap-1 text-sm">
                            <MapPin size={14} />
                            낙상 감지
                          </div>
                          <div className="text-gray-900 font-bold text-lg">14:23</div>
                          <div className="text-xs text-gray-600">거실에서 감지</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <div className="text-orange-600 mb-1 flex items-center gap-1 text-sm">
                            <CheckSquare size={14} />
                            충돌/부딛힘
                          </div>
                          <div className="text-gray-900 font-bold text-lg">15:47</div>
                          <div className="text-xs text-gray-600">모서리 접근</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <div className="text-yellow-600 mb-1 flex items-center gap-1 text-sm">
                            <ShieldCheck size={14} />
                            안전 상태
                          </div>
                          <div className="text-gray-900 font-bold text-lg">95점</div>
                          <div className="text-xs text-gray-600">매우 우수</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-green-600 mb-1 flex items-center gap-1 text-sm">
                            <CheckSquare size={14} />
                            금일 감지
                          </div>
                          <div className="text-gray-900 font-bold text-lg">3건</div>
                          <div className="text-xs text-gray-600">안전사고 유형</div>
                        </div>
                      </div>
                    </div>

                    {/* Floating notification - Modified to be a report badge */}
                    <div className="absolute -right-6 top-32 bg-red-500 text-white p-4 rounded-lg shadow-xl max-w-xs transform rotate-3 animate-pulse">
                      <div className="flex items-start gap-2">
                        <MapPin className="flex-shrink-0" size={20} />
                        <div>
                          <div className="font-semibold mb-1">⚠️ 위험 감지</div>
                          <div className="text-sm">안전 리포트에 기록됨</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 3: 발달 추적 */}
        <div>
          <div className="relative h-[600px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-24 h-24 bg-blue-200/30 rounded-full" />
            <div className="absolute bottom-32 right-20 w-32 h-32 bg-indigo-200/20 rounded-full" />
            <div className="absolute top-1/2 right-40 w-16 h-16 bg-purple-200/40 rounded-full" />

            <div className="container mx-auto px-8 h-full flex items-center justify-center py-10">
              <div className="grid md:grid-cols-2 gap-12 items-center w-full">
                <div className="z-10">
                  <div className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full mb-4 text-sm font-semibold">
                    📊 AI 발달 분석
                  </div>
                  <h1 className="text-gray-900 mb-4 text-3xl font-bold sm:text-5xl">
                    우리 아이의 <br />
                    작은 성장도 놓치지 마세요
                  </h1>
                  <p className="text-gray-600 mb-3 text-base">
                    AI가 아이의 행동을 분석하여 <span className="font-bold text-gray-900">성장 발달</span>을 기록합니다
                  </p>
                  <p className="text-gray-600 mb-6 text-sm">
                    언어, 운동, 인지, 사회성, 정서 5대 영역을
                    <br />
                    월령별 표준과 비교하여 상세히 분석합니다.
                  </p>
                  <Link
                    to="/development-report"
                    className="inline-flex items-center gap-2 justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 text-base font-bold transition-all shadow-lg hover:shadow-xl"
                  >
                    내 아이 발달 분석 시작
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="relative z-10 hidden md:block">
                  {/* Development tracking mockup */}
                  <div className="relative">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 transform rotate-2">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-900 font-bold">이번 달 발달 리포트</h3>
                        <FileBarChart className="text-indigo-600" size={24} />
                      </div>
                      <ImageWithFallback
                        src="/발달 배너사진.png"
                        alt="아이 발달"
                        className="w-full h-64 object-cover rounded-lg mb-4"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-blue-600 mb-1 flex items-center gap-1 text-sm">
                            <CheckSquare size={14} />
                            언어
                          </div>
                          <div className="text-gray-900 font-bold text-2xl">85점</div>
                          <div className="text-xs text-gray-600">평균 대비 +15%</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="text-purple-600 mb-1 flex items-center gap-1 text-sm">
                            <CheckSquare size={14} />
                            운동
                          </div>
                          <div className="text-gray-900 font-bold text-2xl">72점</div>
                          <div className="text-xs text-gray-600">표준 수준</div>
                        </div>
                        <div className="bg-pink-50 p-3 rounded-lg">
                          <div className="text-pink-600 mb-1 flex items-center gap-1 text-sm">
                            <CheckSquare size={14} />
                            인지
                          </div>
                          <div className="text-gray-900 font-bold text-2xl">68점</div>
                          <div className="text-xs text-gray-600">발달 중</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-green-600 mb-1 flex items-center gap-1 text-sm">
                            <CheckSquare size={14} />
                            사회성
                          </div>
                          <div className="text-gray-900 font-bold text-2xl">90점</div>
                          <div className="text-xs text-gray-600">평균 대비 +20%</div>
                        </div>
                      </div>
                    </div>

                    {/* Floating achievement */}
                    <div className="absolute -left-8 top-20 bg-indigo-600 text-white p-4 rounded-lg shadow-xl max-w-xs transform -rotate-3 animate-pulse">
                      <div className="flex items-start gap-3">
                        <Sparkles className="text-yellow-300 flex-shrink-0" size={20} />
                        <div>
                          <div className="mb-1 font-semibold">🎉 새로운 성취!</div>
                          <div className="text-indigo-100 text-sm">혼자서 앉기 성공 (+10점)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 4: 하이라이트 클립 */}
        <div>
          <div className="relative h-[600px] bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-32 left-16 w-20 h-20 bg-rose-200/30 rounded-full" />
            <div className="absolute bottom-20 right-1/4 w-12 h-12 bg-pink-200/40 rounded-full" />
            <div className="absolute top-20 right-32 w-24 h-24 bg-purple-200/25 rounded-full" />

            <div className="container mx-auto px-8 h-full flex items-center justify-center relative z-10 py-10">
              <div className="grid md:grid-cols-2 gap-12 items-center w-full">
                <div>
                  <div className="inline-block px-4 py-1.5 bg-rose-100 text-rose-700 rounded-full mb-4 text-sm font-semibold">
                    🎬 AI 타임라인
                  </div>
                  <h1 className="text-gray-900 mb-4 text-3xl font-bold sm:text-5xl">
                    소중한 순간, <br />
                    하나도 놓치지 않아요
                  </h1>
                  <p className="text-gray-600 mb-3 text-base">
                    AI가 <span className="font-bold text-gray-900">특별한 순간</span>을 자동으로 찾아냅니다
                  </p>
                  <p className="text-gray-600 mb-6 text-sm">
                    첫 미소, 배밀이 성공, 특별한 반응...
                    <br />
                    긴 영상 볼 필요 없이 중요한 순간만 타임라인으로 확인하세요.
                  </p>
                  <Link
                    to="/clip-highlights"
                    className="inline-flex items-center gap-2 justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-700 px-6 py-3 text-base font-bold transition-all shadow-lg hover:shadow-xl"
                  >
                    하이라이트 보러가기
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="relative hidden md:block">
                  {/* Video highlight mockup */}
                  <div className="relative">
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                      <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Video className="text-white" size={20} />
                          <span className="text-white font-semibold">오늘의 하이라이트</span>
                        </div>
                        <span className="text-white text-sm bg-white/20 px-2 py-1 rounded-full">6개 클립</span>
                      </div>
                      <ImageWithFallback
                        src="/안전배너사진.png"
                        alt="아이 활동"
                        className="w-full h-64 object-cover object-[50%_60%]"
                      />
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                          <div className="flex items-center gap-2">
                            <Sparkles className="text-yellow-600" size={16} />
                            <span className="text-gray-900 font-medium">첫 미소 😊</span>
                          </div>
                          <span className="text-yellow-600 text-sm font-semibold">10:23</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <div className="flex items-center gap-2">
                            <Video className="text-blue-600" size={16} />
                            <span className="text-gray-900 font-medium">배밀이 2m 성공!</span>
                          </div>
                          <span className="text-blue-600 text-sm font-semibold">14:15</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                          <div className="flex items-center gap-2">
                            <PlayCircle className="text-purple-600" size={16} />
                            <span className="text-gray-900 font-medium">장난감 잡기</span>
                          </div>
                          <span className="text-purple-600 text-sm font-semibold">16:42</span>
                        </div>
                      </div>

                      {/* Auto-save indicator */}
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-t">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckSquare size={16} className="text-purple-600" />
                          <span>AI가 자동으로 저장 · 편집 불필요</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 5: 체크리스트 */}
        <div>
          <div className="relative h-[600px] bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-20 right-20 w-20 h-20 bg-violet-200/30 rounded-full" />
            <div className="absolute bottom-40 left-32 w-24 h-24 bg-purple-200/20 rounded-full" />
            <div className="absolute top-1/3 left-20 w-16 h-16 bg-fuchsia-200/25 rounded-full" />

            <div className="container mx-auto px-8 h-full flex items-center justify-center relative z-10 py-10">
              <div className="grid md:grid-cols-2 gap-12 h-full w-full">
                <div className="relative overflow-hidden rounded-2xl p-8 h-full flex flex-col justify-center">
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src="/체크리스트배너사진.png"
                      alt="Background"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-50/95 via-violet-50/60 to-transparent" />
                  </div>

                  <div className="relative z-10">
                    <div className="inline-block px-4 py-1.5 bg-violet-100 text-violet-700 rounded-full mb-4 text-sm font-semibold">
                      ✨ 맞춤형 가이드
                    </div>
                    <h1 className="text-gray-900 mb-4 text-3xl font-bold sm:text-5xl">
                      AI가 추천하는 <br />
                      맞춤형 안전 가이드
                    </h1>
                    <p className="text-gray-600 mb-3 text-base">
                      분석 결과를 바탕으로 <span className="font-bold text-gray-900">우선순위가 높은</span> 안전 조치를 추천해드립니다.
                    </p>
                    <p className="text-gray-600 mb-6 text-sm">
                      모서리 가드 설치, 위험 물건 제거 등
                      <br />
                      지금 바로 실행 가능한 가이드를 제공합니다.
                    </p>
                    <Link
                      to="/safety-report"
                      className="inline-flex items-center gap-2 justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 px-6 py-3 text-base font-bold transition-all shadow-lg hover:shadow-xl"
                    >
                      체크리스트 확인하기
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="relative hidden md:block">
                  {/* Checklist mockup */}
                  <div className="relative">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-1">
                      <div className="flex items-center gap-2 mb-6 border-b pb-4">
                        <CheckSquare className="text-violet-600" size={24} />
                        <span className="text-gray-900 font-bold text-xl">오늘의 체크리스트</span>
                      </div>

                      <div className="space-y-4">
                        {/* Item 1 */}
                        <div className="p-4 bg-red-50 rounded-xl border-l-4 border-red-400 flex items-start gap-3">
                          <div className="mt-1"><div className="w-5 h-5 rounded border-2 border-red-400 bg-white" /></div>
                          <div>
                            <div className="font-bold text-gray-900">거실 모서리 보호대 설치</div>
                            <div className="text-red-500 text-sm font-medium mt-1">우선순위: 높음</div>
                          </div>
                        </div>

                        {/* Item 2 */}
                        <div className="p-4 bg-orange-50 rounded-xl border-l-4 border-orange-400 flex items-start gap-3">
                          <div className="mt-1"><div className="w-5 h-5 rounded border-2 border-orange-400 bg-white" /></div>
                          <div>
                            <div className="font-bold text-gray-900">콘센트 안전 커버 점검</div>
                            <div className="text-orange-500 text-sm font-medium mt-1">우선순위: 높음</div>
                          </div>
                        </div>

                        {/* Item 3 */}
                        <div className="p-4 bg-yellow-50 rounded-xl border-l-4 border-yellow-400 flex items-start gap-3">
                          <div className="mt-1"><div className="w-5 h-5 rounded border-2 border-yellow-400 bg-white" /></div>
                          <div>
                            <div className="font-bold text-gray-900">서랍 안전 잠금장치 확인</div>
                            <div className="text-yellow-600 text-sm font-medium mt-1">우선순위: 중간</div>
                          </div>
                        </div>

                        {/* Item 4 */}
                        <div className="p-4 bg-blue-50 rounded-xl border-l-4 border-blue-400 flex items-start gap-3">
                          <div className="mt-1"><div className="w-5 h-5 rounded border-2 border-blue-400 bg-white" /></div>
                          <div>
                            <div className="font-bold text-gray-900">작은 물건 정리 (질식 위험)</div>
                            <div className="text-blue-600 text-sm font-medium mt-1">우선순위: 중간</div>
                          </div>
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
    </div>
  );
}
