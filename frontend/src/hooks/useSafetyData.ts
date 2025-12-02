import { useState, useEffect, useMemo } from 'react';
import { getAuthHeader } from '../lib/auth';
import { SafetyReportData, ClockData } from '../types/safety';
import { MOCK_INCIDENT_TYPE_DATA } from '../constants/safety';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getSeverityColor = (severity: string | null) => {
    switch (severity) {
        case 'safe':
            return '#34d399';
        case 'warning':
            return '#facc15';
        case 'danger':
            return '#f87171';
        default:
            return '#e5e7eb';
    }
};

export function useSafetyData() {
    const [periodType, setPeriodType] = useState<'week' | 'month'>('week');
    const [safetyData, setSafetyData] = useState<SafetyReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [date] = useState<Date>(new Date());

    useEffect(() => {
        async function loadSafetyData() {
            try {
                setLoading(true);
                const response = await fetch(
                    `${API_BASE_URL}/api/safety/summary?period_type=${periodType}`,
                    {
                        method: 'GET',
                        headers: {
                            ...getAuthHeader(),
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setSafetyData(data);
                } else {
                    // API 실패 시 기본값 사용
                    setSafetyData({
                        trendData: periodType === 'week'
                            ? Array.from({ length: 7 }, (_, i) => ({ date: ['월', '화', '수', '목', '금', '토', '일'][i], 안전도: 0 }))
                            : Array.from({ length: 4 }, (_, i) => ({ date: `${i + 1}주`, 안전도: 0 })),
                        incidentTypeData: MOCK_INCIDENT_TYPE_DATA,
                        clockData: Array.from({ length: 24 }, (_, hour) => ({
                            hour,
                            safetyLevel: 'safe',
                            safetyScore: 95
                        })),
                        safetySummary: '아직 분석된 데이터가 없습니다.',
                        safetyScore: 0
                    });
                }
            } catch (error) {
                console.error('안전 리포트 데이터 로딩 오류:', error);
                setSafetyData({
                    trendData: periodType === 'week'
                        ? Array.from({ length: 7 }, (_, i) => ({ date: ['월', '화', '수', '목', '금', '토', '일'][i], 안전도: 0 }))
                        : Array.from({ length: 4 }, (_, i) => ({ date: `${i + 1}주`, 안전도: 0 })),
                    incidentTypeData: MOCK_INCIDENT_TYPE_DATA,
                    clockData: Array.from({ length: 24 }, (_, hour) => ({
                        hour,
                        safetyLevel: 'safe',
                        safetyScore: 95
                    })),
                    safetySummary: '아직 분석된 데이터가 없습니다.',
                    safetyScore: 0
                });
            } finally {
                setLoading(false);
            }
        }

        loadSafetyData();
    }, [periodType]);

    const clockData: ClockData[] = useMemo(() => {
        if (!safetyData) return [];
        return safetyData.clockData.map(d => ({
            hour: d.hour,
            safetyLevel: d.safetyLevel as any,
            safetyScore: d.safetyScore,
            color: getSeverityColor(d.safetyLevel),
            incident: d.safetyLevel === 'safe' ? '안정적인 상태' : '주의 필요'
        }));
    }, [safetyData]);

    return {
        periodType,
        setPeriodType,
        safetyData,
        loading,
        date,
        clockData
    };
}
