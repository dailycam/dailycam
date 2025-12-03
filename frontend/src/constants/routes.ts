/**
 * 라우트 경로 상수
 */

export const ROUTES = {
    HOME: '/',
    DASHBOARD: '/dashboard',
    SAFETY_REPORT: '/safety-report',
    DEVELOPMENT_REPORT: '/development-report',
    VIDEO_ANALYSIS: '/video-analysis',
    ANALYTICS: '/analytics',
    MONITORING: '/monitoring',
    SETTINGS: '/settings',
    CAMERA_SETUP: '/camera-setup',
} as const

/**
 * 라우트 타입
 */
export type RouteKey = keyof typeof ROUTES
export type RoutePath = typeof ROUTES[RouteKey]

/**
 * 네비게이션 메뉴 아이템
 */
export interface NavItem {
    path: RoutePath
    label: string
    icon?: string
}

/**
 * 메인 네비게이션 메뉴
 */
export const MAIN_NAV_ITEMS: NavItem[] = [
    { path: ROUTES.HOME, label: '홈' },
    { path: ROUTES.DASHBOARD, label: '대시보드' },
    { path: ROUTES.SAFETY_REPORT, label: '안전 리포트' },
    { path: ROUTES.DEVELOPMENT_REPORT, label: '발달 리포트' },
    { path: ROUTES.VIDEO_ANALYSIS, label: '비디오 분석' },
    { path: ROUTES.ANALYTICS, label: '분석' },
    { path: ROUTES.MONITORING, label: '모니터링' },
]
