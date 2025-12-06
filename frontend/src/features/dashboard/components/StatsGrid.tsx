import { motion } from 'motion/react'
import { Shield, Baby, Eye, Activity, TrendingUp, LucideIcon } from 'lucide-react'

interface Stat {
    label: string
    value: string
    unit: string
    change: string
    changeLabel: string
    icon: LucideIcon
    color: string
    bgColor: string
    trend: 'up' | 'down' | 'neutral'
}

interface StatsGridProps {
    safetyScore: number
    developmentScore: number
    monitoringHours: number
    incidentCount: number
}

export const StatsGrid: React.FC<StatsGridProps> = ({
    safetyScore,
    developmentScore,
    monitoringHours,
    incidentCount
}) => {
    const stats: Stat[] = [
        {
            label: '안전 점수',
            value: safetyScore.toString(),
            unit: '점',
            change: safetyScore > 0 ? '+3' : '',
            changeLabel: safetyScore > 0 ? '지난주 대비' : '',
            icon: Shield,
            color: 'text-safe',
            bgColor: 'bg-safe-50',
            trend: 'up'
        },
        {
            label: '발달 점수',
            value: developmentScore.toString(),
            unit: '점',
            change: developmentScore > 0 ? '+7' : '',
            changeLabel: developmentScore > 0 ? '지난주 대비' : '',
            icon: Baby,
            color: 'text-primary-600',
            bgColor: 'bg-primary-50',
            trend: 'up'
        },
        {
            label: '모니터링 시간',
            value: monitoringHours.toFixed(1),
            unit: '시간',
            change: '오늘',
            changeLabel: '누적',
            icon: Eye,
            color: 'text-safe',
            bgColor: 'bg-safe-50',
            trend: 'neutral'
        },
        {
            label: '이벤트 감지',
            value: incidentCount.toString(),
            unit: '건',
            change: incidentCount === 0 ? '안전함' : '확인 필요',
            changeLabel: incidentCount === 0 ? '특이사항 없음' : '감지된 이벤트',
            icon: Activity,
            color: incidentCount === 0 ? 'text-safe' : 'text-warning',
            bgColor: incidentCount === 0 ? 'bg-safe-50' : 'bg-warning-50',
            trend: 'neutral'
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                    >
                        <div className={`card p-5 border-0 hover:shadow-soft-lg transition-all ${stat.bgColor}`}>
                            <div className="flex items-start justify-between mb-3">
                                <Icon className={`w-5 h-5 ${stat.color}`} />
                                {stat.trend === 'up' && (
                                    <span className="text-xs text-safe flex items-center gap-0.5">
                                        <TrendingUp className="w-3 h-3" />
                                        {stat.change}
                                    </span>
                                )}
                            </div>
                            <div className="mb-1">
                                <span className={`text-3xl ${stat.color}`}>{stat.value}</span>
                                <span className="text-gray-500 ml-1">{stat.unit}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-0.5">{stat.label}</p>
                            <p className="text-xs text-gray-400">{stat.changeLabel}</p>
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
}
