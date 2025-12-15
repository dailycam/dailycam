import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from '../layout/Sidebar'
import Header from '../layout/Header'

import { API_BASE_URL } from '@/constants/api'

/**
 * 앱 내부 페이지용 레이아웃
 * 사이드바와 헤더 포함
 * 전역 비디오 플레이어 포함 (라우트 밖에 배치하여 페이지 이동 시에도 유지)
 */
export default function AppLayout() {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const location = useLocation()
    const [hlsUrl, setHlsUrl] = useState<string | null>(null)
    const [selectedCamera, setSelectedCamera] = useState('camera-1')
    const isMonitoringPage = location.pathname === '/monitoring'

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed)
    }

    // 스트림 상태 확인 (항상 확인하여 플레이어 유지)
    useEffect(() => {
        const checkStreamStatus = async () => {
            try {
                const status = await fetch(
                    `${API_BASE_URL}/api/live-monitoring/stream-status/${selectedCamera}`,
                    { credentials: 'include' }
                )
                const data = await status.json()

                if (data.is_active && data.is_running) {
                    const url = `${API_BASE_URL}/api/live-monitoring/hls/${selectedCamera}/${selectedCamera}.m3u8`
                    // URL이 변경되지 않으면 플레이어를 재초기화하지 않음
                    setHlsUrl(prevUrl => {
                        if (prevUrl === url) return prevUrl
                        return url
                    })
                } else {
                    // 스트림이 중지되었으면 플레이어도 정지
                    setHlsUrl(null)
                }
            } catch (error) {
                console.error('[AppLayout] 스트림 상태 확인 실패:', error)
                setHlsUrl(null)
            }
        }

        checkStreamStatus()

        // 주기적으로 상태 확인 (5초마다 - 영상 삭제 등 즉시 반영)
        const interval = setInterval(checkStreamStatus, 5000)
        return () => clearInterval(interval)
    }, [selectedCamera])

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
                    {/* 전역 비디오 플레이어 (모니터링 페이지일 때만 표시, LiveMonitoring 위에 배치) */}



                    <Outlet context={{ hlsUrl, setHlsUrl, selectedCamera, setSelectedCamera, isMonitoringPage }} />
                </main>
            </div>
        </div>
    )
}
