/**
 * API 엔드포인트 상수
 */

/**
 * API 베이스 URL
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * API 엔드포인트
 */
export const API_ENDPOINTS = {
    // 비디오 분석
    ANALYZE_VIDEO: '/api/homecam/analyze-video',

    // 라이브 모니터링
    UPLOAD_VIDEO: '/api/live-monitoring/upload-video',
    STREAM: '/api/live-monitoring/stream',
    STOP_STREAM: '/api/live-monitoring/stop-stream',

    // 대시보드
    DASHBOARD_SUMMARY: '/api/dashboard/summary',

    // 안전 리포트
    SAFETY_SUMMARY: '/api/safety/summary',
    SAFETY_EVENTS_RESOLVE: '/api/safety/events',

    // 발달 리포트
    DEVELOPMENT_SUMMARY: '/api/development/summary',

    // 분석
    ANALYTICS_ALL: '/api/analytics/all',

    // 클립 하이라이트
    CLIPS_LIST: '/api/clips/list',
} as const

/**
 * API 엔드포인트 타입
 */
export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS]

/**
 * HTTP 메서드
 */
export const HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
} as const

/**
 * API 타임아웃 설정 (밀리초)
 */
export const API_TIMEOUTS = {
    DEFAULT: 30000,        // 30초
    VIDEO_UPLOAD: 300000,  // 5분
    VIDEO_ANALYSIS: 300000, // 5분
} as const

/**
 * API 응답 상태 코드
 */
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
} as const
