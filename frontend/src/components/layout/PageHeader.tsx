import { ReactNode } from 'react'
import { motion } from 'motion/react'
import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
    title: string
    description?: string
    icon?: LucideIcon
    actions?: ReactNode
    gradient?: boolean
}

/**
 * 페이지 헤더 공통 컴포넌트
 */
export const PageHeader = ({
    title,
    description,
    icon: Icon,
    actions,
    gradient = true,
}: PageHeaderProps) => {
    const titleClasses = gradient
        ? 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent text-3xl font-bold'
        : 'text-3xl font-bold text-gray-900'

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 flex items-center justify-between"
        >
            <div>
                <div className="flex items-center gap-3 mb-2">
                    {Icon && <Icon className="w-8 h-8 text-primary-600" />}
                    <h1 className={titleClasses}>{title}</h1>
                </div>
                {description && <p className="text-gray-600">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </motion.div>
    )
}
