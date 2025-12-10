export interface ClockData {
    hour: number;
    safetyLevel: 'safe' | 'warning' | 'danger' | null;
    safetyScore: number;
    color: string;
    incident: string;
}

export interface SafetyReportData {
    trendData: Array<{ date: string; 안전도: number }>;
    incidentTypeData: Array<{ name: string; value: number; color: string; count: number }>;
    clockData: Array<{ hour: number; safetyLevel: string; safetyScore: number }>;
    safetySummary: string;
    safetyScore: number;
}
