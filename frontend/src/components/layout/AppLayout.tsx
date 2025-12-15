import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '../layout/Sidebar'
import Header from '../layout/Header'

/**
 * 앱 내부 페이지용 레이아웃
 * 사이드바와 헤더 포함
 */
export default function AppLayout() {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [selectedCamera, setSelectedCamera] = useState('camera-1')

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed)
    }

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Header isSidebarOpen={!isCollapsed} />

                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                    <Outlet context={{ selectedCamera, setSelectedCamera }} />
                </main>
            </div>
        </div>
    )
}
