import { motion } from 'motion/react'
import { Baby, TrendingUp } from 'lucide-react'
import { RadarDataItem } from '../types'
import { withParticle } from '../../../utils/formatters'

const STAGE_DEFINITIONS = [
    { stage: 1, name: '신뢰기', range: '0~2개월' },
    { stage: 2, name: '감각기', range: '3~5개월' },
    { stage: 3, name: '영속기', range: '6~8개월' },
    { stage: 4, name: '의도기', range: '9~11개월' },
    { stage: 5, name: '분리기', range: '12~17개월' },
    { stage: 6, name: '자율기', range: '18~23개월' },
    { stage: 7, name: '표상기', range: '24~29개월' },
    { stage: 8, name: '주도기', range: '30~35개월' },
    { stage: 9, name: '중심화기', range: '36~47개월' },
    { stage: 10, name: '사회기', range: '48~59개월' },
    { stage: 11, name: '근면기', range: '60~71개월' },
] as const

function getStageDisplay(detectedStage?: string, ageMonths?: number) {
    let stageNumber: number | undefined

    if (detectedStage) {
        const match = detectedStage.match(/(\d+)단계/)
        if (match) {
            stageNumber = Number(match[1])
        }
    }

    if (stageNumber === undefined && typeof ageMonths === 'number') {
        if (ageMonths >= 0 && ageMonths <= 2) stageNumber = 1
        else if (ageMonths >= 3 && ageMonths <= 5) stageNumber = 2
        else if (ageMonths >= 6 && ageMonths <= 8) stageNumber = 3
        else if (ageMonths >= 9 && ageMonths <= 11) stageNumber = 4
        else if (ageMonths >= 12 && ageMonths <= 17) stageNumber = 5
        else if (ageMonths >= 18 && ageMonths <= 23) stageNumber = 6
        else if (ageMonths >= 24 && ageMonths <= 29) stageNumber = 7
        else if (ageMonths >= 30 && ageMonths <= 35) stageNumber = 8
        else if (ageMonths >= 36 && ageMonths <= 47) stageNumber = 9
        else if (ageMonths >= 48 && ageMonths <= 59) stageNumber = 10
        else if (ageMonths >= 60 && ageMonths <= 71) stageNumber = 11
    }

    if (stageNumber !== undefined) {
        const def = STAGE_DEFINITIONS.find((d) => d.stage === stageNumber)
        if (def) {
            return `${def.name} (${def.stage}단계, ${def.range})`
        }
    }

    if (detectedStage) return detectedStage
    if (typeof ageMonths === 'number' && ageMonths > 0) return `${ageMonths}개월`
    return '분석 대기 중'
}

interface DevelopmentStageCardProps {
    ageMonths?: number
    detectedStage?: string
    strongestArea?: RadarDataItem
    childName?: string
}

export const DevelopmentStageCard = ({ ageMonths, detectedStage, strongestArea, childName = '우리 아이' }: DevelopmentStageCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
        >
            <div className="card p-6 bg-gradient-to-br from-primary-100/40 to-cyan-50/30 border-0 h-full">
                <div className="text-center h-full flex flex-col justify-center">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Baby className="w-10 h-10 text-white" />
                        </div>
                    </motion.div>
                    <p className="text-sm text-gray-600 mb-2">현재 발달 단계</p>
                    <p className="text-primary-600 mb-4 text-2xl font-bold">
                        {getStageDisplay(detectedStage, ageMonths)}
                    </p>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-safe" />
                            <p className="text-sm text-gray-700 font-medium">발달 강점</p>
                        </div>
                        {strongestArea && strongestArea.score > 0 ? (
                            <p className="text-base text-gray-800 leading-relaxed">
                                {withParticle(childName, '은/는')} <span className="text-safe font-semibold">{strongestArea.category} 발달</span>에서 강점을 보여주네요! 🌟
                            </p>
                        ) : (
                            <p className="text-base text-gray-500 leading-relaxed">
                                아직 충분한 데이터가 모이지 않았어요.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
