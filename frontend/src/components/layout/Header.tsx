import { Bell, User, LogOut, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  addNotification,
  deleteNotification,
  clearAllNotifications,
  getNotifications,
  getUnreadCount,
  formatRelativeTime,
  type StoredNotification
} from '../../lib/notifications'


interface HeaderProps {
  isSidebarOpen: boolean
}

export default function Header({ isSidebarOpen }: HeaderProps) {
  const { user: userInfo, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // 알림 불러오기
  const loadNotifications = () => {
    const stored = getNotifications();
    setNotifications(stored.slice(0, 10)); // 최근 10개만 헤더에 표시
    setUnreadCount(getUnreadCount());
  };

  // 컴포넌트 마운트 시 알림 로드
  useEffect(() => {
    loadNotifications();
  }, []);

  // 알림 이벤트 리스너
  useEffect(() => {
    const handleChecklistCompleted = (event: CustomEvent) => {
      const { item } = event.detail;
      
      // localStorage에 저장
      addNotification({
        title: '안전 체크리스트 완료',
        message: `'${item.title}' 항목이 완료 처리되었습니다.`,
        type: 'checklist_completed',
        data: item
      });

      // 알림 목록 새로고침
      loadNotifications();
    };

    window.addEventListener('checklist-completed' as any, handleChecklistCompleted);
    return () => {
      window.removeEventListener('checklist-completed' as any, handleChecklistCompleted);
    };
  }, []);

  const handleRollback = (notification: StoredNotification) => {
    if (notification.type === 'checklist_completed' && notification.data) {
      // 롤백 이벤트 발생
      const event = new CustomEvent('checklist-rollback', {
        detail: { item: notification.data }
      });
      window.dispatchEvent(event);

      // 알림 삭제
      deleteNotification(notification.id);
      loadNotifications();
    }
  };

  const handleClearAll = () => {
    clearAllNotifications();
    loadNotifications();
  };

  // 플랜 코드 → 표시용 문구
  const getPlanLabel = () => {
    if (!userInfo) return '로딩 중...'

    const subscribed = Boolean(userInfo.is_subscribed)

    if (!subscribed) return '무료 회원'

    switch (userInfo.subscription_plan) {
      case 'BASIC':
        return '베이직 플랜 회원'
      case 'PREMIUM':
        return '프리미엄 플랜 회원'
      default:
        return '구독 회원'
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        {!isSidebarOpen && (
          <Link to="/" className="flex items-center gap-3">
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
              <h1 className="text-lg font-bold text-gray-900">Daily-cam</h1>
              <p className="text-xs text-gray-500">아이 곁에</p>
            </div>
          </Link>
        )}
      </div>

      {/* Right Section (Notifications and User Profile) */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-5 h-5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">최근 알림</h3>
                <div className="flex gap-2">
                  <Link
                    to="/settings"
                    state={{ section: 'notifications' }}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    onClick={() => setShowNotifications(false)}
                  >
                    전체 보기
                  </Link>
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    모두 지우기
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  새로운 알림이 없습니다.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((noti) => (
                    <div 
                      key={noti.id} 
                      className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors ${
                        !noti.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-medium text-gray-900">{noti.title}</p>
                        <span className="text-xs text-gray-400">{formatRelativeTime(noti.timestamp)}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{noti.message}</p>
                      {noti.type === 'checklist_completed' && (
                        <button
                          onClick={() => handleRollback(noti)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                        >
                          <LogOut className="w-3 h-3 rotate-180" />
                          실행 취소
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100 text-center">
                  <Link
                    to="/settings"
                    state={{ section: 'notifications' }}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    onClick={() => setShowNotifications(false)}
                  >
                    모든 알림 보기 →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile with Dropdown */}
        <div className="relative pl-4 border-l border-gray-200">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {userInfo?.name || '로딩 중...'}
              </p>
              <p className="text-xs text-gray-500">{getPlanLabel()}</p>
            </div>
            {userInfo?.picture ? (
              <img
                src={userInfo.picture}
                alt={userInfo.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white">
                <User className="w-5 h-5" />
              </div>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''
                }`}
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
