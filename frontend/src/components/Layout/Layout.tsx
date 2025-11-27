import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  // 로컬스토리지에서 사이드바 상태 복원
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen')
    return saved !== null ? JSON.parse(saved) : true
  })

  // 상태 변경 시 로컬스토리지에 저장
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen))
  }, [isSidebarOpen])

  const sidebarTransformClasses = isSidebarOpen
    ? 'translate-x-0 lg:translate-x-0'
    : '-translate-x-full lg:-translate-x-full'
  const mainLayoutMargin = isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
  const SIDEBAR_WIDTH = 256
  const toggleButtonLeft = isSidebarOpen ? SIDEBAR_WIDTH : 12
  const toggleButtonTranslateClass = isSidebarOpen ? 'translate-x-0' : '-translate-x-1/2'

  return (
    <div className="relative flex h-screen bg-gray-50">

      {/* 모바일용 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="사이드바 토글"
        className={`flex fixed top-1/2 z-[60] h-28 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-gray-100 ${toggleButtonTranslateClass}`}
        style={{ left: `${toggleButtonLeft}px` }}
      >
        {isSidebarOpen ? (
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed lg:absolute inset-y-0 left-0 z-50
          lg:h-full
          transform transition-transform duration-300 ease-in-out
          ${sidebarTransformClasses}
        `}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${mainLayoutMargin}`}>
        <Header isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <main className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

