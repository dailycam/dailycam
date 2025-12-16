import { Baby, Download } from 'lucide-react'
import { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
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
  const reportRef = useRef<HTMLDivElement>(null)

  const {
    selectedDate,
    handleDateChange,
    availableDates,
    developmentData,
    radarData,
    strongestArea,
    dailyDevelopmentFrequency,
    childName
  } = useDevelopmentReport()

  const handleDownload = async () => {
    if (!reportRef.current) return

    try {
      // actions 영역의 버튼만 숨기기
      const actionsDiv = reportRef.current.querySelector('[data-actions="true"]')

      // gradient 제목을 일반 텍스트로 변경 (html2canvas가 bg-clip-text를 제대로 렌더링하지 못함)
      const titleElement = reportRef.current.querySelector('h1')
      const originalClasses = titleElement?.className || ''

      if (titleElement) {
        titleElement.className = 'text-3xl font-bold text-gray-900'
      }

      if (actionsDiv) {
        const actionButtons = actionsDiv.querySelectorAll('button')
        actionButtons.forEach(btn => {
          btn.style.visibility = 'hidden'
        })

        // HTML을 캔버스로 변환
        const canvas = await html2canvas(reportRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })

        // 버튼 다시 표시
        actionButtons.forEach(btn => {
          btn.style.visibility = 'visible'
        })

        // 제목 스타일 복원
        if (titleElement) {
          titleElement.className = originalClasses
        }

        // PDF 생성
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        })

        const imgWidth = 210 // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`발달리포트_${formatDate(selectedDate)}.pdf`)
      }
    } catch (error) {
      console.error('PDF 다운로드 실패:', error)
      alert('리포트 다운로드에 실패했습니다.')
    }
  }

  return (
    <div ref={reportRef} className="p-8">
      {/* Header */}
      <PageHeader
        title="발달 리포트"
        description="영유아 발달 현황을 확인하세요"
        icon={Baby}
        actions={
          <>
            {/* 날짜 선택 드롭다운 */}
            <select
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => handleDateChange(new Date(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {availableDates.map((date) => (
                <option key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
            <Button variant="primary" icon={Download} onClick={handleDownload}>
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
          detectedStage={developmentData?.detectedStage}
          strongestArea={strongestArea}
          childName={childName}
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
