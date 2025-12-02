import { useState, useEffect, useMemo } from 'react';
import { getDevelopmentData, DevelopmentData } from '../lib/api';
import { DEFAULT_RADAR_DATA, DEFAULT_FREQUENCY_DATA } from '../constants/development';
import { RadarDataItem } from '../types/development';

export function useDevelopmentData() {
    const [date] = useState<Date>(new Date());
    const [developmentData, setDevelopmentData] = useState<DevelopmentData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const data = await getDevelopmentData(7);
                setDevelopmentData(data);
            } catch (error) {
                console.error('발달 데이터 로드 실패:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const radarData: RadarDataItem[] = useMemo(() => {
        if (developmentData) {
            return Object.entries(developmentData.developmentRadarScores).map(([category, score]) => ({
                category,
                score,
                average: Math.max(50, Math.min(90, score + Math.random() * 20 - 10)), // 또래 평균 (모의 데이터)
                fullMark: 100,
            }));
        }
        return DEFAULT_RADAR_DATA;
    }, [developmentData]);

    const maxScore = Math.max(...radarData.map(item => item.score));
    const strongestArea = radarData.find(item => item.score === maxScore);

    const dailyDevelopmentFrequency = developmentData?.dailyDevelopmentFrequency || DEFAULT_FREQUENCY_DATA;

    return {
        date,
        developmentData,
        loading,
        radarData,
        strongestArea,
        dailyDevelopmentFrequency,
    };
}
