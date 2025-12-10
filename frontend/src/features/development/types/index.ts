export interface DevelopmentRadarScores {
    언어: number
    운동: number
    인지: number
    사회성: number
    정서: number
}

export interface DevelopmentFrequencyItem {
    category: string
    count: number
    color: string
}

export interface RecommendedActivity {
    title: string
    benefit: string
    description?: string
    duration?: string
}

export interface RadarDataItem {
    category: string
    score: number
    average: number
    fullMark: number
}
