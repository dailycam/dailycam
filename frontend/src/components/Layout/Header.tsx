import { Bell, User } from 'lucide-react'

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6">
      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">김부모님</p>
            <p className="text-xs text-gray-500">프리미엄 회원</p>
          </div>
          <button className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white hover:shadow-lg transition-shadow">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

