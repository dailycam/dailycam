import { motion } from 'motion/react';
import { Eye, Activity, Music, Hand } from 'lucide-react';
import { RecommendedActivityUI } from '../../types/development';

interface ActivityCardProps {
    activity: RecommendedActivityUI;
    index: number;
}

export const ActivityCard = ({ activity, index }: ActivityCardProps) => {
    // 아이콘 이름에 따라 컴포넌트 선택
    const IconComponent =
        activity.icon === 'Eye' ? Eye :
            activity.icon === 'Activity' ? Activity :
                activity.icon === 'Music' ? Music :
                    activity.icon === 'Hand' ? Hand : Eye;

    // 배경에 맞는 아이콘 색상 선택
    const iconColor =
        activity.icon === 'Eye' ? 'text-orange-600' :
            activity.icon === 'Activity' ? 'text-green-600' :
                activity.icon === 'Music' ? 'text-blue-600' :
                    activity.icon === 'Hand' ? 'text-cyan-600' : 'text-gray-700';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            whileHover={{ y: -4 }}
            className={`p-5 bg-gradient-to-br ${activity.gradient} rounded-3xl border-0 transition-all ${activity.score >= 85 ? 'ring-2 ring-primary-300 shadow-glow-mint' : 'shadow-soft hover:shadow-soft-lg'
                }`}
        >
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center shadow-sm">
                    <IconComponent className={`w-6 h-6 ${iconColor}`} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-gray-800 font-semibold">{activity.title}</h4>
                        <span className="text-xs px-3 py-1 bg-white/80 text-gray-700 rounded-full shadow-sm">
                            {activity.category}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{activity.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">⏱ {activity.duration}</span>
                        <span className="flex items-center gap-1">✨ {activity.benefit}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
