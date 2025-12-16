import { motion } from 'motion/react'
import { Baby, TrendingUp } from 'lucide-react'
import { RadarDataItem } from '../types'
import { withParticle } from '../../../utils/formatters'

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
                        {detectedStage || (ageMonths ? `${ageMonths}개월` : '분석 대기 중')}
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
