import { Shield, Calendar as CalendarIcon, Download } from 'lucide-react';
import { useSafetyReport } from '../features/safety/hooks/useSafetyReport';
import { SafetySummary } from '../features/safety/components/SafetySummary';
import { SafetyScoreCard } from '../features/safety/components/SafetyScoreCard';
import { SafetyChecklist } from '../features/safety/components/SafetyChecklist';
import { IncidentChart } from '../features/safety/components/IncidentChart';
import { SafetyTrendChart } from '../features/safety/components/SafetyTrendChart';
import { PageHeader } from '../components/layout';
import { Button, LoadingSpinner } from '../components/ui';
import { formatDate } from '../utils';

export default function SafetyReport() {
  const {
    periodType,
    setPeriodType,
    safetyData,
    loading,
    date,
    localChecklist,
    handleCheck
  } = useSafetyReport();

  if (loading || !safetyData) {
    return <LoadingSpinner text="안전 리포트 로딩 중..." />
  }

  const incidentTypeData = safetyData?.incidentTypeData || [];
  const currentSafetyScore = safetyData?.safetyScore || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <PageHeader
        title="아이 안전 리포트"
        description="영유아 안전 현황을 확인하세요"
        icon={Shield}
        actions={
          <>
            <Button variant="secondary" icon={CalendarIcon}>
              {formatDate(date)}
            </Button>
            <Button variant="primary" icon={Download}>
              리포트 다운로드
            </Button>
          </>
        }
      />

      {/* AI Summary & Score Card Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <SafetySummary safetyData={safetyData} incidentTypeData={incidentTypeData} />
        <SafetyScoreCard currentSafetyScore={currentSafetyScore} />
      </div>

      {/* Charts Section: 체크리스트 + 사고 유형 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SafetyChecklist localChecklist={localChecklist} onCheck={handleCheck} />
        <IncidentChart incidentTypeData={incidentTypeData} />
      </div>

      {/* Safety Trend Section */}
      <SafetyTrendChart
        trendData={safetyData.trendData}
        periodType={periodType}
        setPeriodType={setPeriodType}
      />
    </div>
  );
}