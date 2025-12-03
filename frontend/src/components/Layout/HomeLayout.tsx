import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

export default function HomeLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    const element = document.querySelector(targetId)
    if (element) {
      const navbarHeight = 64 // h-16 = 4rem = 64px
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - navbarHeight

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      setMobileMenuOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <nav className="mx-auto max-w-7xl px-6 lg:px-8" aria-label="Top">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Daily-cam 로고"
                className="w-12 h-12"
                onError={(e) => {
                  // 로고 이미지가 없을 경우 폴백
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">👶</span>
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Daily-cam</h1>
                <p className="text-xs text-gray-500">아이 곁에</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:gap-8">
              <a
                href="#features"
                onClick={(e) => handleSmoothScroll(e, '#features')}
                className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                기능
              </a>
              <a
                href="#pricing"
                onClick={(e) => handleSmoothScroll(e, '#pricing')}
                className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                가격
              </a>
              <a
                href="#testimonials"
                onClick={(e) => handleSmoothScroll(e, '#testimonials')}
                className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                고객 후기
              </a>
            </div>

            {/* Right Section */}
            <div className="hidden md:flex md:items-center md:gap-4">
              <Link
                to="/dashboard"
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
              >
                시작하기
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">메뉴 열기</span>
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-1 border-t border-gray-200">
              <a
                href="#features"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600 rounded-lg"
                onClick={(e) => handleSmoothScroll(e, '#features')}
              >
                기능
              </a>
              <a
                href="#pricing"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600 rounded-lg"
                onClick={(e) => handleSmoothScroll(e, '#pricing')}
              >
                가격
              </a>
              <a
                href="#testimonials"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600 rounded-lg"
                onClick={(e) => handleSmoothScroll(e, '#testimonials')}
              >
                고객 후기
              </a>
              <div className="pt-4 space-y-2 border-t border-gray-200 mt-4">
                <Link
                  to="/dashboard"
                  className="block rounded-lg bg-primary-600 px-3 py-2 text-base font-semibold text-white shadow-sm hover:bg-primary-500"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  시작하기
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Daily-cam 로고"
                className="w-10 h-10"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">👶</span>
              </div>
              <div>
                <h1 className="text-base font-bold">Daily-cam</h1>
                <p className="text-xs text-gray-400">아이 곁에</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 text-center">
              © 2024 Daily-cam. All rights reserved. Made with ❤️ for safer childcare
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

