import { SimpleClockChart } from '../features/dashboard/components/SimpleClockChart'
import { ClockGaugeSection } from '../features/dashboard/components/ClockGaugeSection'
import { ActivityTable } from '../features/dashboard/components/ActivityTable'
import { StatsGrid } from '../features/dashboard/components/StatsGrid'
import { EventModal } from '../features/dashboard/components/EventModal'
import { useDashboard } from '../features/dashboard/hooks/useDashboard'
import { LayoutDashboard, FileText } from 'lucide-react'
import { useState } from 'react'
import { DailyReportModal } from '../features/reports/DailyReportModal'

export const Dashboard = () => {
    const {
        error,
        selectedHour,
        setSelectedHour,
        timelineEvents,
        monitoringRanges,
        hourlyStats,
        clockData,
        dailyStats,
        isModalOpen,
        modalEvents,
        modalTimeRange,
        modalCategory,
        handleEventClick,
        closeModal
    } = useDashboard()

    // State for Report Modal
    const [showReportModal, setShowReportModal] = useState(false);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 에러만 표시, 로딩 중에도 UI는 표시
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-8 h-8 text-primary-600" />
                    <h1 className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent text-3xl font-bold">
                        대시보드
                    </h1>
                </div>

                {/* 데일리 리포트 버튼 */}
                <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium transition-colors"
                >
                    <FileText className="w-5 h-5" />
                    오늘의 육아 리포트
                </button>
            </div>
            <p className="text-gray-600 mb-6">오늘 하루를 한눈에 확인하세요</p>

            {/* 1. 상단: 카드 섹션 4개 (백엔드 실제 데이터) */}
            <StatsGrid
                safetyScore={dailyStats.safetyScore}
                developmentScore={dailyStats.developmentScore}
                monitoringHours={dailyStats.monitoringHours}
                incidentCount={dailyStats.incidentCount}
            />

            {/* 2. 중단: 통합 카드 (시계 + 통계 패널) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* 왼쪽: 시계 (5칸 차지) */}
                    <div className="col-span-5 flex flex-col items-center justify-center relative overflow-visible">
                        <SimpleClockChart
                            fullClockData={clockData}
                            events={timelineEvents}
                            monitoringRanges={monitoringRanges}
                            onHourClick={setSelectedHour}
                        />
                    </div>

                    {/* 오른쪽: 통계 패널 (6칸 차지, 7번째 칸부터 시작하여 가운데 1칸 공백 확보) */}
                    <div className="col-span-6 col-start-7">
                        <ClockGaugeSection
                            selectedHour={selectedHour}
                            hourlyStats={hourlyStats}
                        />
                    </div>
                </div>
            </div>

            {/* 3. 하단: 활동 로그 테이블 */}
            <ActivityTable
                timelineEvents={timelineEvents}
                onEventClick={handleEventClick}
            />

            {/* 이벤트 상세 모달 */}
            <EventModal
                isOpen={isModalOpen}
                onClose={closeModal}
                events={modalEvents}
                timeRange={modalTimeRange}
                category={modalCategory}
            />

            {/* 데일리 리포트 모달 */}
            <DailyReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                date={today}
            />
        </div>
    )
}
