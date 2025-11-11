import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Video,
  MonitorPlay,
  FileText,
  BarChart3,
  Settings,
  Baby,
} from 'lucide-react'

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '홈캠 연동', href: '/camera-setup', icon: Video },
  { name: '실시간 모니터링', href: '/live-monitoring', icon: MonitorPlay },
  { name: '일일 리포트', href: '/daily-report', icon: FileText },
  { name: '데이터 분석', href: '/analytics', icon: BarChart3 },
  { name: '설정', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
            <Baby className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Daily-cam</h1>
            <p className="text-xs text-gray-500">아이 곁에</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Subscription Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary-700">프리미엄 플랜</span>
            <span className="text-xs text-gray-600">30일 남음</span>
          </div>
          <div className="w-full bg-white rounded-full h-2 mb-2">
            <div className="bg-primary-500 h-2 rounded-full" style={{ width: '70%' }}></div>
          </div>
          <button className="w-full text-xs text-primary-700 font-medium hover:text-primary-800">
            플랜 관리 →
          </button>
        </div>
      </div>
    </div>
  )
}

