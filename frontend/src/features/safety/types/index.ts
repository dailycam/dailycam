export interface ChecklistItem {
    id: number;
    title: string;
    icon: string;
    description: string;
    priority: 'high' | 'medium' | 'low' | '권장';
    gradient: string;
    checked: boolean;
}

export interface SafetyReportData {
    trendData: Array<{ date: string; 안전도: number }>;
    incidentTypeData: Array<{ name: string; value: number; color: string; count: number }>;
    clockData: Array<{ hour: number; safetyLevel: string; safetyScore: number }>;
    safetySummary: string;
    safetyScore: number;
    checklist?: ChecklistItem[];
    insights?: string[];
}
