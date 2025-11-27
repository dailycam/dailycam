import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 모바일용 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - 모바일: fixed, 데스크톱: 조건부 렌더링 */}
      <div
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          lg:h-full
          transform transition-transform duration-300 ease-in-out
          lg:transform-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${!isSidebarOpen ? 'lg:hidden' : 'lg:block'}
        `}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 토글 버튼 바 */}
        <div className="h-16 border-b border-gray-200 bg-white flex items-center px-4 gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="사이드바 토글"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5 text-gray-700" />
            ) : (
              <Menu className="w-5 h-5 text-gray-700" />
            )}
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Daily-cam</h2>
        </div>

        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

