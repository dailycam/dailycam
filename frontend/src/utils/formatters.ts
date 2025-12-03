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

/**
 * 한글 받침 확인 함수
 * @param word 확인할 단어
 * @returns 받침이 있으면 true, 없으면 false
 */
const hasFinalConsonant = (word: string): boolean => {
    if (!word || word.length === 0) return false

    const lastChar = word.charAt(word.length - 1)
    const code = lastChar.charCodeAt(0)

    // 한글 유니코드 범위: 0xAC00(가) ~ 0xD7A3(힣)
    if (code < 0xAC00 || code > 0xD7A3) {
        // 한글이 아닌 경우 (영어, 숫자 등)
        // 영어 자음으로 끝나면 받침 있는 것으로 처리
        return /[bcdfghjklmnpqrstvwxyz]$/i.test(lastChar)
    }

    // 한글의 경우: (코드 - 0xAC00) % 28이 0이면 받침 없음
    return (code - 0xAC00) % 28 !== 0
}

/**
 * 이름에 맞는 "은/는" 조사 선택
 * @example getSubjectParticle("지수") // "는"
 * @example getSubjectParticle("민준") // "은"
 */
export const getSubjectParticle = (name: string): string => {
    return hasFinalConsonant(name) ? '은' : '는'
}

/**
 * 이름에 맞는 "이/가" 조사 선택
 * @example getNominativeParticle("지수") // "가"
 * @example getNominativeParticle("민준") // "이"
 */
export const getNominativeParticle = (name: string): string => {
    return hasFinalConsonant(name) ? '이' : '가'
}

/**
 * 이름에 맞는 "을/를" 조사 선택
 * @example getObjectParticle("지수") // "를"
 * @example getObjectParticle("민준") // "을"
 */
export const getObjectParticle = (name: string): string => {
    return hasFinalConsonant(name) ? '을' : '를'
}

/**
 * 이름과 조사를 합쳐서 반환
 * @example withParticle("지수", "은/는") // "지수는"
 * @example withParticle("민준", "이/가") // "민준이"
 */
export const withParticle = (name: string, particleType: '은/는' | '이/가' | '을/를'): string => {
    let particle = ''

    switch (particleType) {
        case '은/는':
            particle = getSubjectParticle(name)
            break
        case '이/가':
            particle = getNominativeParticle(name)
            break
        case '을/를':
            particle = getObjectParticle(name)
            break
    }

    return `${name}${particle}`
}
