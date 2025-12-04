import { useState, useEffect } from 'react';
import { getAuthHeader } from '../../../lib/auth';
import { SafetyReportData, ChecklistItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const useSafetyReport = () => {
    const [periodType, setPeriodType] = useState<'week' | 'month'>('week');
    const [safetyData, setSafetyData] = useState<SafetyReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [date] = useState<Date>(new Date());
    const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>([]);

    // 실제 데이터 가져오기
    useEffect(() => {
        async function loadSafetyData() {
            try {
                setLoading(true)
                const response = await fetch(
                    `${API_BASE_URL}/api/safety/summary?period_type=${periodType}`,
                    {
                        method: 'GET',
                        headers: {
                            ...getAuthHeader(),
                        },
                    }
                )

                if (response.ok) {
                    const data = await response.json()
                    setSafetyData(data)
                } else {
                    // API 실패 시 기본값 사용
                    setSafetyData({
                        trendData: periodType === 'week'
                            ? Array.from({ length: 7 }, (_, i) => ({ date: ['월', '화', '수', '목', '금', '토', '일'][i], 안전도: 0 }))
                            : Array.from({ length: 4 }, (_, i) => ({ date: `${i + 1}주`, 안전도: 0 })),
                        incidentTypeData: [
                            { name: '낙상', value: 0, color: '#fca5a5', count: 0 },
                            { name: '충돌/부딛힘', value: 0, color: '#fdba74', count: 0 },
                            { name: '끼임', value: 0, color: '#fde047', count: 0 },
                            { name: '전도(가구 넘어짐)', value: 0, color: '#86efac', count: 0 },
                            { name: '감전', value: 0, color: '#7dd3fc', count: 0 },
                            { name: '질식', value: 0, color: '#c4b5fd', count: 0 },
                        ],
                        clockData: [],
                        safetySummary: '아직 분석된 데이터가 없습니다.',
                        safetyScore: 0,
                        checklist: [],
                        insights: []
                    })
                }
            } catch (error) {
                console.error('안전 리포트 데이터 로딩 오류:', error)
                // 에러 시 기본값 사용
                setSafetyData({
                    trendData: periodType === 'week'
                        ? Array.from({ length: 7 }, (_, i) => ({ date: ['월', '화', '수', '목', '금', '토', '일'][i], 안전도: 0 }))
                        : Array.from({ length: 4 }, (_, i) => ({ date: `${i + 1}주`, 안전도: 0 })),
                    incidentTypeData: [
                        { name: '낙상', value: 0, color: '#fca5a5', count: 0 },
                        { name: '충돌/부딛힘', value: 0, color: '#fdba74', count: 0 },
                        { name: '끼임', value: 0, color: '#fde047', count: 0 },
                        { name: '전도(가구 넘어짐)', value: 0, color: '#86efac', count: 0 },
                        { name: '감전', value: 0, color: '#7dd3fc', count: 0 },
                        { name: '질식', value: 0, color: '#c4b5fd', count: 0 },
                    ],
                    clockData: [],
                    safetySummary: '아직 분석된 데이터가 없습니다.',
                    safetyScore: 0,
                    checklist: [],
                    insights: []
                })
            } finally {
                setLoading(false)
            }
        }

        loadSafetyData()
    }, [periodType])

    // 데이터 로드 시 로컬 체크리스트 초기화
    useEffect(() => {
        if (safetyData?.checklist) {
            setLocalChecklist(safetyData.checklist);
        }
    }, [safetyData]);

    // 체크리스트 완료 처리
    const handleCheck = async (item: ChecklistItem) => {
        // 1. 로컬 목록에서 제거 (UI 즉시 반영)
        setLocalChecklist(prev => prev.filter(i => i.title !== item.title));

        // 2. 서버 상태 업데이트
        try {
            await fetch(`${API_BASE_URL}/api/safety/events/${item.id}/resolve?resolved=true`, {
                method: 'POST',
                headers: {
                    ...getAuthHeader(),
                },
            });
        } catch (error) {
            console.error('체크리스트 상태 업데이트 실패:', error);
        }

        // 3. 완료 이벤트 발생 (Header 알림용)
        const event = new CustomEvent('checklist-completed', {
            detail: { item }
        });
        window.dispatchEvent(event);
    };

    // 롤백 이벤트 리스너
    useEffect(() => {
        const handleRollback = async (event: CustomEvent) => {
            const { item } = event.detail;

            // 서버 상태 업데이트 (롤백)
            try {
                await fetch(`${API_BASE_URL}/api/safety/events/${item.id}/resolve?resolved=false`, {
                    method: 'POST',
                    headers: {
                        ...getAuthHeader(),
                    },
                });
            } catch (error) {
                console.error('체크리스트 롤백 실패:', error);
            }

            setLocalChecklist(prev => {
                // 중복 방지
                if (prev.find(i => i.title === item.title)) return prev;

                // 우선순위 점수 계산 함수 (정렬용)
                const getPriorityScore = (priority: string) => {
                    if (priority === 'high') return 3;
                    if (priority === 'medium') return 2;
                    return 1;
                };

                // 다시 추가하고 정렬
                const newList = [item, ...prev];
                return newList.sort((a, b) => {
                    // 1. 우선순위 비교
                    const scoreA = getPriorityScore(a.priority);
                    const scoreB = getPriorityScore(b.priority);
                    if (scoreA !== scoreB) return scoreB - scoreA; // 내림차순

                    // 2. 이름순 (보조 정렬)
                    return a.title.localeCompare(b.title);
                });
            });
        };

        window.addEventListener('checklist-rollback' as any, handleRollback);
        return () => {
            window.removeEventListener('checklist-rollback' as any, handleRollback);
        };
    }, []);

    return {
        periodType,
        setPeriodType,
        safetyData,
        loading,
        date,
        localChecklist,
        handleCheck
    };
};
