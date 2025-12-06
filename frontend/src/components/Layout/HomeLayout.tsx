import { Outlet } from 'react-router-dom'

/**
 * 홈(랜딩) 페이지용 레이아웃
 * 사이드바 없이 간단한 구조
 */
export default function HomeLayout() {
    return (
        <div className="min-h-screen bg-white">
            <Outlet />
        </div>
    )
}
