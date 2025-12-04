export interface TimelineEvent {
    time: string
    hour: number
    type: 'development' | 'safety'
    severity?: 'danger' | 'warning' | 'info'
    title: string
    description: string
    category?: string
    hasClip?: boolean
    thumbnailUrl?: string
    videoUrl?: string
}

export interface MonitoringRange {
    start: string
    end: string
}

export interface HourlyStat {
    hour: number
    safetyScore: number
    developmentScore: number
    eventCount: number
}

export interface DailyStats {
    safetyScore: number
    developmentScore: number
    monitoringHours: number
    incidentCount: number
}

export interface ClockData {
    hour: number
    safetyLevel: 'safe' | 'warning' | 'danger' | null
    safetyScore: number
    color: string
    incident: string
}
