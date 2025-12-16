<<<<<<< HEAD:frontend/src/components/Layout/AppLayout.tsx
import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import HLSVideoPlayer from '../HLSVideoPlayer'
import { API_BASE_URL } from '@/constants/api'
=======
import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '../layout/Sidebar'
import Header from '../layout/Header'
>>>>>>> aeeee4d7df38868b2068c57a6b64016cbbe1e4ef:frontend/src/components/layout/AppLayout.tsx

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

<<<<<<< HEAD:frontend/src/components/Layout/AppLayout.tsx
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

=======
>>>>>>> aeeee4d7df38868b2068c57a6b64016cbbe1e4ef:frontend/src/components/layout/AppLayout.tsx
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
<<<<<<< HEAD:frontend/src/components/Layout/AppLayout.tsx
                    {/* 전역 비디오 플레이어 (모니터링 페이지일 때만 표시, LiveMonitoring 위에 배치) */}
                    {isMonitoringPage && hlsUrl && (
                        <div
                            className="w-full bg-black border-b-2 border-gray-300"
                            style={{
                                height: '300px',
                                position: 'relative',
                                zIndex: 10,
                                overflow: 'hidden'
                            }}
                        >
                            <HLSVideoPlayer
                                src={hlsUrl}
                                autoPlay={true}
                                muted={false}
                                keepAliveOnHidden={true}
                                onError={(error) => {
                                    // 스트림 중지 에러 시 즉시 플레이어 정지
                                    if (error.includes('404') || error.includes('스트림 중지') || error.includes('스트림이 중지되었습니다')) {
                                        console.log('[AppLayout] 스트림 중지 감지, 플레이어 정지')
                                        setHlsUrl(null)
                                    }
                                }}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                    {/* 모니터링 페이지가 아닐 때 플레이어 숨김 (언마운트하지 않음) */}
                    {!isMonitoringPage && hlsUrl && (
                        <div style={{ display: 'none' }}>
                            <HLSVideoPlayer
                                src={hlsUrl}
                                autoPlay={true}
                                muted={false}
                                keepAliveOnHidden={true}
                                onError={(error) => {
                                    if (error.includes('404') || error.includes('스트림 중지') || error.includes('스트림이 중지되었습니다')) {
                                        setHlsUrl(null)
                                    }
                                }}
                                className="w-full h-full"
                            />
                        </div>
                    )}

                    <Outlet context={{ hlsUrl, setHlsUrl, selectedCamera, setSelectedCamera, isMonitoringPage }} />
=======
                    <Outlet context={{ selectedCamera, setSelectedCamera }} />
>>>>>>> aeeee4d7df38868b2068c57a6b64016cbbe1e4ef:frontend/src/components/layout/AppLayout.tsx
                </main>
            </div>
        </div>
    )
}
