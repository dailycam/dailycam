/**
 * 안전도 관련 유틸리티 함수
 */

export interface SafetyBadge {
    text: string
    color: string
}

/**
 * 안전도 레벨에 따른 배지 정보 반환
 * @param level - 안전도 레벨
 * @returns 배지 텍스트와 색상 클래스
 */
export const getSafetyLevelBadge = (level: string): SafetyBadge => {
    const badges: Record<string, SafetyBadge> = {
        '매우높음': { text: '매우 안전', color: 'bg-green-100 text-green-700' },
        '높음': { text: '안전', color: 'bg-green-100 text-green-700' },
        '중간': { text: '주의', color: 'bg-yellow-100 text-yellow-700' },
        '낮음': { text: '위험', color: 'bg-red-100 text-red-700' },
        '매우낮음': { text: '매우 위험', color: 'bg-red-100 text-red-700' }
    }
    return badges[level] || { text: level, color: 'bg-gray-100 text-gray-700' }
}

/**
 * 안전 점수에 따른 색상 클래스 반환
 * @param score - 안전 점수 (0-100)
 * @returns Tailwind 색상 클래스
 */
export const getSafetyScoreColor = (score?: number): string => {
    if (score === undefined || score === null) return 'text-gray-100'
    if (score >= 90) return 'text-green-300'
    if (score >= 70) return 'text-green-200'
    if (score >= 50) return 'text-yellow-200'
    return 'text-red-300'
}

/**
 * 안전 점수에 따른 텍스트 색상 반환 (진한 색상)
 * @param score - 안전 점수 (0-100)
 * @returns Tailwind 색상 클래스
 */
export const getSafetyScoreTextColor = (score: number): string => {
    if (score >= 90) return 'text-green-700'
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
}

/**
 * 안전 점수에 따른 배경 색상 반환
 * @param score - 안전 점수 (0-100)
 * @returns Tailwind 색상 클래스
 */
export const getSafetyScoreBgColor = (score: number): string => {
    if (score >= 90) return 'bg-green-50'
    if (score >= 70) return 'bg-green-100'
    if (score >= 50) return 'bg-yellow-50'
    return 'bg-red-50'
}

/**
 * 심각도에 따른 색상 클래스 반환
 * @param severity - 심각도 레벨
 * @returns Tailwind 색상 클래스
 */
export const getSeverityColor = (severity: 'danger' | 'warning' | 'info' | string): string => {
    const colors: Record<string, string> = {
        danger: 'text-red-600',
        warning: 'text-yellow-600',
        info: 'text-blue-600'
    }
    return colors[severity] || 'text-gray-600'
}

/**
 * 심각도에 따른 배경 색상 클래스 반환
 * @param severity - 심각도 레벨
 * @returns Tailwind 색상 클래스
 */
export const getSeverityBgColor = (severity: 'danger' | 'warning' | 'info' | string): string => {
    const colors: Record<string, string> = {
        danger: 'bg-red-50 border-red-200',
        warning: 'bg-amber-50 border-amber-200',
        info: 'bg-gray-50 border-gray-200'
    }
    return colors[severity] || 'bg-gray-50 border-gray-200'
}

/**
 * 안전 점수에 따른 상태 텍스트 반환
 * @param score - 안전 점수 (0-100)
 * @returns 상태 텍스트
 */
export const getSafetyStatusText = (score: number): string => {
    if (score >= 90) return '매우 우수'
    if (score >= 70) return '양호'
    if (score >= 50) return '주의'
    return '위험'
}

/**
 * 우선순위에 따른 색상 클래스 반환
 * @param priority - 우선순위
 * @returns Tailwind 색상 클래스
 */
export const getPriorityColor = (priority: 'high' | 'medium' | 'low' | '권장' | string): string => {
    const colors: Record<string, string> = {
        high: 'bg-rose-100 text-rose-700 border-rose-200',
        medium: 'bg-amber-100 text-amber-700 border-amber-200',
        low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        '권장': 'bg-blue-100 text-blue-700 border-blue-200'
    }
    return colors[priority] || 'bg-gray-100 text-gray-700 border-gray-200'
}

/**
 * 우선순위 텍스트 반환
 * @param priority - 우선순위
 * @returns 우선순위 텍스트
 */
export const getPriorityText = (priority: 'high' | 'medium' | 'low' | '권장' | string): string => {
    const texts: Record<string, string> = {
        high: '높은 우선순위',
        medium: '중간 우선순위',
        low: '낮은 우선순위',
        '권장': '권장사항'
    }
    return texts[priority] || priority
}
