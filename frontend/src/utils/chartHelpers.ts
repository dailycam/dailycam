/**
 * 차트 데이터 변환 및 헬퍼 함수
 */

/**
 * 레이더 차트 데이터 생성
 * @param scores - 카테고리별 점수 객체
 * @param averageScore - 또래 평균 점수 (기본값: 70)
 * @returns 레이더 차트 데이터 배열
 */
export const createRadarChartData = (
    scores: Record<string, number>,
    averageScore: number = 70
) => {
    return Object.entries(scores).map(([category, score]) => ({
        category,
        score,
        average: averageScore,
        fullMark: 100,
    }))
}

/**
 * 막대 그래프 그라디언트 ID 생성
 * @param index - 인덱스
 * @returns 그라디언트 ID
 */
export const getGradientId = (index: number): string => {
    return `gradient-${index}`
}

/**
 * 차트 색상 팔레트
 */
export const CHART_COLORS = {
    primary: '#14b8a6',
    secondary: '#86d5a8',
    tertiary: '#ffdb8b',
    quaternary: '#5fe9d0',
    quinary: '#99f6e0',
    safe: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    development: '#c084fc',
    monitoring: '#60a5fa',
    baseGray: '#e5e7eb',
}

/**
 * 발달 영역별 색상 매핑
 */
export const DEVELOPMENT_COLORS: Record<string, string> = {
    언어: '#14b8a6',
    운동: '#86d5a8',
    인지: '#ffdb8b',
    사회성: '#5fe9d0',
    정서: '#99f6e0',
}

/**
 * 발달 영역별 색상 가져오기
 * @param category - 발달 영역
 * @returns 색상 코드
 */
export const getDevelopmentColor = (category: string): string => {
    return DEVELOPMENT_COLORS[category] || CHART_COLORS.baseGray
}

/**
 * 활동 benefit에 따른 배경 그라디언트 클래스 반환
 * @param benefit - 활동 benefit
 * @returns Tailwind 그라디언트 클래스
 */
export const getActivityBgGradient = (benefit: string): string => {
    const gradients: Record<string, string> = {
        운동: 'from-green-50 to-emerald-50',
        언어: 'from-purple-50 to-pink-50',
        인지: 'from-yellow-50 to-orange-50',
        사회성: 'from-red-50 to-rose-50',
        정서: 'from-orange-50 to-red-50',
    }
    return gradients[benefit] || 'from-blue-50 to-indigo-50'
}

/**
 * 차트 툴팁 스타일
 */
export const CHART_TOOLTIP_STYLE = {
    backgroundColor: 'white',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
}

/**
 * 주간 트렌드 데이터를 요일별로 변환
 * @param data - 주간 트렌드 데이터
 * @returns 요일이 포함된 데이터
 */
export const addWeekdayToTrendData = <T extends { day?: string; date?: string }>(
    data: T[]
): T[] => {
    return data.map((item) => ({
        ...item,
        day: item.day || item.date || '',
    }))
}

/**
 * 빈 차트 데이터 생성 (데이터가 없을 때)
 * @param length - 데이터 길이
 * @param labels - 라벨 배열
 * @returns 빈 데이터 배열
 */
export const createEmptyChartData = (
    length: number,
    labels: string[]
): Array<{ label: string; value: number }> => {
    return Array.from({ length }, (_, i) => ({
        label: labels[i] || `항목 ${i + 1}`,
        value: 0,
    }))
}
