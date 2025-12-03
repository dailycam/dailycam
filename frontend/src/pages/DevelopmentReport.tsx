import { Baby, Download, Calendar as CalendarIcon } from 'lucide-react'
import { useDevelopmentReport } from '../features/development/hooks/useDevelopmentReport'
import { DevelopmentSummary } from '../features/development/components/DevelopmentSummary'
import { DevelopmentStageCard } from '../features/development/components/DevelopmentStageCard'
import { DevelopmentRadarChart } from '../features/development/components/DevelopmentRadarChart'
import { DevelopmentFrequencyChart } from '../features/development/components/DevelopmentFrequencyChart'
import { RecommendedActivities } from '../features/development/components/RecommendedActivities'
import { PageHeader } from '../components/layout'
import { Button } from '../components/ui'
import { formatDate } from '../utils'

export default function DevelopmentReport() {
  const {
    date,
    developmentData,
    radarData,
    strongestArea,
    dailyDevelopmentFrequency
  } = useDevelopmentReport()

  return (
    <div className="p-8">
      {/* Header */}
      <PageHeader
        title="발달 리포트"
        description="영유아 발달 현황을 확인하세요"
        icon={Baby}
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

      {/* AI Daily Summary & Development Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <DevelopmentSummary
          developmentSummary={developmentData?.developmentSummary || ''}
          developmentInsights={developmentData?.developmentInsights || []}
        />
        <DevelopmentStageCard
          ageMonths={developmentData?.ageMonths || 0}
          strongestArea={strongestArea}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <DevelopmentRadarChart radarData={radarData} />
        <DevelopmentFrequencyChart dailyDevelopmentFrequency={dailyDevelopmentFrequency} />
      </div>

      {/* Recommended Activities Section */}
      <RecommendedActivities recommendedActivities={developmentData?.recommendedActivities || []} />
    </div>
  )
}
