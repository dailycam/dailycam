import { ReactNode } from 'react'
import { motion } from 'motion/react'

interface SectionProps {
    children: ReactNode
    title?: string
    description?: string
    className?: string
    delay?: number
}

/**
 * 섹션 래퍼 컴포넌트
 */
export const Section = ({
    children,
    title,
    description,
    className = '',
    delay = 0,
}: SectionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            className={className}
        >
            {(title || description) && (
                <div className="mb-6">
                    {title && (
                        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <div className="w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
                            {title}
                        </h2>
                    )}
                    {description && <p className="text-sm text-gray-600">{description}</p>}
                </div>
            )}
            {children}
        </motion.div>
    )
}
