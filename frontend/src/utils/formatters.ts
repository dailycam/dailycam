/**
 * 날짜 포맷팅 유틸리티
 */

/**
 * Date 객체를 한국어 형식으로 변환
 * @example formatDate(new Date()) // "2024년 12월 3일"
 */
export const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

/**
 * Date 객체를 짧은 형식으로 변환
 * @example formatDateShort(new Date()) // "2024.12.03"
 */
export const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '')
}

/**
 * 숫자를 소수점 1자리까지 포맷팅
 * @example formatNumber(8.567) // "8.6"
 */
export const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals)
}

/**
 * 점수를 백분율로 변환
 * @example formatPercentage(92) // "92%"
 */
export const formatPercentage = (score: number): string => {
    return `${Math.round(score)}%`
}

/**
 * 시간을 "시간" 단위로 포맷팅
 * @example formatHours(8.5) // "8.5시간"
 */
export const formatHours = (hours: number): string => {
    return `${formatNumber(hours)}시간`
}

/**
 * 개월 수를 포맷팅
 * @example formatMonths(7) // "7개월"
 */
export const formatMonths = (months: number): string => {
    return `${months}개월`
}

/**
 * 이벤트 카운트를 포맷팅
 * @example formatEventCount(3) // "3건"
 */
export const formatEventCount = (count: number): string => {
    return `${count}건`
}

/**
 * 시간 범위를 포맷팅
 * @example formatTimeRange("14:00", "15:00") // "14:00 - 15:00"
 */
export const formatTimeRange = (start: string, end: string): string => {
    return `${start} - ${end}`
}

/**
 * 요일 배열 (한글)
 */
export const WEEKDAYS_KR = ['월', '화', '수', '목', '금', '토', '일']

/**
 * 날짜를 요일로 변환
 * @example getWeekday(new Date()) // "월"
 */
export const getWeekday = (date: Date): string => {
    const day = date.getDay()
    return WEEKDAYS_KR[day === 0 ? 6 : day - 1]
}
