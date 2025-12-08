import {
    Home,
    LayoutDashboard,
    MonitorPlay,
    TrendingUp,
    Shield,
    Film,
    Settings,
    ChevronLeft,
    Video,
    Menu
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    { label: '홈', icon: Home, href: '/home' },
    { label: '대시보드', icon: LayoutDashboard, href: '/dashboard' },
    { label: '모니터링', icon: MonitorPlay, href: '/monitoring' },
    { label: '발달 리포트', icon: TrendingUp, href: '/development-report' },
    { label: '안전 리포트', icon: Shield, href: '/safety-report' },
    { label: '클립 하이라이트', icon: Film, href: '/clip-highlights' },
    { label: '비디오 분석', icon: Video, href: '/video-analysis-test' },
    { label: '설정', icon: Settings, href: '/settings' },
];

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
    const location = useLocation();

    return (
        <aside
            className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
                {!isCollapsed && (
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">👶</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Daily-cam</h1>
                        </div>
                    </Link>
                )}
                <button
                    onClick={toggleSidebar}
                    className={`p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors ${isCollapsed ? 'mx-auto' : ''
                        }`}
                >
                    {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${isActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-700 hover:bg-gray-50'
                                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Plan Info */}
            {!isCollapsed && (
                <div className="p-4 border-t border-gray-200">
                    <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-primary-700">프리미엄 플랜</span>
                            <span className="text-xs text-gray-600">30일 남음</span>
                        </div>
                        <div className="w-full bg-white rounded-full h-2 mb-2">
                            <div className="bg-primary-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                        </div>
                        <Link to="/subscription" className="block text-center text-xs text-primary-700 font-medium hover:text-primary-800">
                            플랜 관리 →
                        </Link>
                    </div>
                </div>
            )}
        </aside>
    );
}
