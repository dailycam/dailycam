/**
 * 색상 팔레트 상수
 */

/**
 * 안전/안심 테마 색상 팔레트 (파스텔 민트)
 */
export const SAFETY_COLORS = {
    PRIMARY: '#14b8a6',
    PRIMARY_LIGHT: '#2dd4bf',
    PRIMARY_DARK: '#0d9488',
    HEADER_GRADIENT: 'from-primary-500 via-primary-600 to-primary-700',
    SUMMARY_BG_GRADIENT: 'from-primary-100/40 via-primary-50/30 to-cyan-50/30',
    LINE_STROKE: '#14b8a6',
    HOUR_LINE_INACTIVE: '#e5e7eb',
} as const

/**
 * 차트 색상 팔레트
 */
export const CHART_COLORS = {
    safe: '#34d399',      // 부드러운 에메랄드
    warning: '#fbbf24',   // 따뜻한 앰버
    danger: '#f87171',    // 부드러운 코랄
    development: '#c084fc', // 부드러운 라벤더 (보라)
    monitoring: '#60a5fa',  // 부드러운 하늘색
    baseGray: '#e5e7eb',
    baseGreen: '#34d399',  // safe 색상과 동일
} as const

/**
 * 발달 영역별 색상
 */
export const DEVELOPMENT_AREA_COLORS = {
    언어: '#14b8a6',
    운동: '#86d5a8',
    인지: '#ffdb8b',
    사회성: '#5fe9d0',
    정서: '#99f6e0',
} as const

/**
 * 사고 유형별 색상
 */
export const INCIDENT_TYPE_COLORS = {
    낙상: '#fca5a5',
    '충돌/부딛힘': '#fdba74',
    끼임: '#fde047',
    '전도(가구 넘어짐)': '#86efac',
    감전: '#7dd3fc',
    질식: '#c4b5fd',
} as const

/**
 * 심각도별 색상
 */
export const SEVERITY_COLORS = {
    사고: 'bg-red-100 text-red-700 border-red-300',
    위험: 'bg-orange-100 text-orange-700 border-orange-300',
    주의: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    권장: 'bg-blue-100 text-blue-700 border-blue-300',
} as const

/**
 * 우선순위별 색상
 */
export const PRIORITY_COLORS = {
    high: 'bg-rose-100 text-rose-700 border-rose-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    권장: 'bg-blue-100 text-blue-700 border-blue-200',
} as const

/**
 * 활동 benefit별 배경 그라디언트
 */
export const ACTIVITY_BG_GRADIENTS = {
    운동: 'from-green-50 to-emerald-50',
    언어: 'from-purple-50 to-pink-50',
    인지: 'from-yellow-50 to-orange-50',
    사회성: 'from-red-50 to-rose-50',
    정서: 'from-orange-50 to-red-50',
    default: 'from-blue-50 to-indigo-50',
} as const
