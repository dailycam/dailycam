import { useEffect, useState } from 'react';
import { Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { HourlyStat } from '../types';

interface ClockGaugeSectionProps {
    selectedHour: number;
    hourlyStats?: HourlyStat[];
}

export function ClockGaugeSection({ selectedHour, hourlyStats = [] }: ClockGaugeSectionProps) {
    const [, setCurrentHour] = useState(new Date().getHours());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentHour(new Date().getHours());
        }, 60000); // 1분마다 업데이트

        return () => clearInterval(timer);
    }, []);

    // 선택된 시간과 이전 시간의 통계 찾기
    const selectedStat = hourlyStats.find(stat => stat.hour === selectedHour);
    const prevHour = selectedHour === 0 ? 23 : selectedHour - 1;
    const prevStat = hourlyStats.find(stat => stat.hour === prevHour);

    // 점수 변화 계산 - 둘 다 데이터가 있을 때만 계산
    const hasCurrentData = (selectedStat?.eventCount ?? 0) > 0;
    const hasPrevData = (prevStat?.eventCount ?? 0) > 0;

    const safetyChange = hasCurrentData && hasPrevData
        ? selectedStat!.safetyScore - prevStat!.safetyScore
        : 0;
    const developmentChange = hasCurrentData && hasPrevData
        ? selectedStat!.developmentScore - prevStat!.developmentScore
        : 0;

    // 실제 점수: 데이터가 있으면 그 시간의 점수, 없으면 0
    const actualSafetyScore = hasCurrentData ? selectedStat!.safetyScore : 0;
    const actualDevelopmentScore = hasCurrentData ? selectedStat!.developmentScore : 0;

    return (
        <div className="space-y-6 max-w-lg">
            {/* 헤더 */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">선택한 시간대 ({selectedHour}시) 분석</h3>
                </div>
                <p className="text-sm text-gray-500">
                    시계에서 시간대를 클릭하면 해당 시간의 분석 결과를 확인할 수 있습니다.
                </p>
            </div>

            {/* 안전 점수 */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-gray-700">안전 점수</span>
                    </div>
                    {safetyChange !== 0 && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${safetyChange > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {safetyChange > 0 ? (
                                <>
                                    <TrendingUp className="w-4 h-4" />
                                    <span>▲ {Math.abs(safetyChange)}점</span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="w-4 h-4" />
                                    <span>▼ {Math.abs(safetyChange)}점</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                                style={{ width: `${actualSafetyScore}%` }}
                            />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {actualSafetyScore}
                        <span className="text-base text-gray-500 ml-1">/ {hasCurrentData ? 100 : 0}</span>
                    </div>
                </div>
            </div>

            {/* 발달 점수 */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-sm font-medium text-gray-700">발달 점수</span>
                    </div>
                    {developmentChange !== 0 && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${developmentChange > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {developmentChange > 0 ? (
                                <>
                                    <TrendingUp className="w-4 h-4" />
                                    <span>▲ {Math.abs(developmentChange)}점</span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="w-4 h-4" />
                                    <span>▼ {Math.abs(developmentChange)}점</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                style={{ width: `${actualDevelopmentScore}%` }}
                            />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {actualDevelopmentScore}
                        <span className="text-base text-gray-500 ml-1">/ {hasCurrentData ? 100 : 0}</span>
                    </div>
                </div>
            </div>


            {/* 모니터링 분석 횟수 */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-gray-700">모니터링 분석 횟수</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-gray-900">
                        {selectedStat?.analysisCount || 0}
                    </div>
                    <span className="text-sm text-gray-500">회</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                    {selectedHour}:00 - {(selectedHour + 1) % 24}:00 시간대에 VLM 분석 완료
                </div>
            </div>
        </div>
    );
}
