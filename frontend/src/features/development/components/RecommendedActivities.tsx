import { motion } from 'motion/react'
import { Baby } from 'lucide-react'
import { RecommendedActivity } from '../types'

interface RecommendedActivitiesProps {
    recommendedActivities: RecommendedActivity[]
}

export const RecommendedActivities = ({ recommendedActivities }: RecommendedActivitiesProps) => {
    if (!recommendedActivities || recommendedActivities.length === 0) {
        return null
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mb-8"
        >
            <div className="card p-8 bg-white border-0">
                <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold h-8">
                    <Baby className="w-6 h-6 text-primary-500" />
                    추천 활동
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendedActivities.slice(0, 4).map((activity, index) => {
                        // Benefit에 따른 색상 매핑 (이모지 제거, 색상만 유지)
                        let bgColor = "from-blue-50 to-indigo-50";

                        if (activity.benefit === "운동") {
                            bgColor = "from-green-50 to-emerald-50";
                        } else if (activity.benefit === "언어") {
                            bgColor = "from-purple-50 to-pink-50";
                        } else if (activity.benefit === "인지") {
                            bgColor = "from-yellow-50 to-orange-50";
                        } else if (activity.benefit === "사회성") {
                            bgColor = "from-red-50 to-rose-50";
                        } else if (activity.benefit === "정서") {
                            bgColor = "from-orange-50 to-red-50";
                        }

                        return (
                            <div
                                key={index}
                                className={`p-6 rounded-2xl border border-gray-100 shadow-sm bg-gradient-to-br ${bgColor} flex flex-col text-left`}
                            >
                                <h4 className="text-lg font-bold text-gray-900 mb-1">{activity.title}</h4>
                                <p className="text-sm text-gray-600">{activity.benefit} 발달에 좋아요!</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    )
}
