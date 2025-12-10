import { motion } from 'motion/react'
import { ContentCard } from './ContentCard'
import { RecommendedLink } from '../types'
import { LucideIcon } from 'lucide-react'

interface RecommendationSectionProps {
    title: string
    icon: LucideIcon
    iconColorClass: string // e.g., "from-red-500 to-red-600"
    links: RecommendedLink[]
    emptyMessage: string
    delay: number
}

export const RecommendationSection = ({
    title,
    icon: Icon,
    iconColorClass,
    links,
    emptyMessage,
    delay,
}: RecommendationSectionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            className="mb-8 bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColorClass} flex items-center justify-center shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {links.length > 0 ? (
                    links.map((link) => (
                        <div key={link.id} className="flex-shrink-0 w-80 snap-start">
                            <ContentCard link={link} />
                        </div>
                    ))
                ) : (
                    <div className="flex-1 text-center py-12">
                        <p className="text-gray-500">{emptyMessage}</p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
