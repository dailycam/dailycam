import { DevelopmentData } from '../lib/api';

export interface RadarDataItem {
    category: string;
    score: number;
    average: number;
    fullMark: number;
}

export interface RecommendedActivityUI {
    title: string;
    category: string;
    icon: string;
    description: string;
    duration: string;
    benefit: string;
    gradient: string;
    score: number;
}

export type { DevelopmentData };
