import { ReactNode } from 'react'
import { motion } from 'motion/react'

interface CardProps {
    children: ReactNode
    className?: string
    padding?: 'none' | 'sm' | 'md' | 'lg'
    variant?: 'default' | 'gradient' | 'bordered'
    hover?: boolean
    onClick?: () => void
}

const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
}

const variantClasses = {
    default: 'bg-white border-0 shadow-sm',
    gradient: 'bg-gradient-to-br from-primary-100/40 via-primary-50/30 to-cyan-50/30 border-0',
    bordered: 'bg-white border border-gray-200',
}

/**
 * 재사용 가능한 카드 컴포넌트
 */
export const Card = ({
    children,
    className = '',
    padding = 'md',
    variant = 'default',
    hover = false,
    onClick,
}: CardProps) => {
    const baseClasses = 'rounded-3xl transition-all'
    const hoverClasses = hover ? 'hover:shadow-soft-lg cursor-pointer' : ''
    const paddingClass = paddingClasses[padding]
    const variantClass = variantClasses[variant]

    const combinedClasses = `${baseClasses} ${variantClass} ${paddingClass} ${hoverClasses} ${className}`

    if (onClick) {
        return (
            <motion.div
                className={combinedClasses}
                onClick={onClick}
                whileHover={hover ? { scale: 1.02 } : undefined}
                whileTap={hover ? { scale: 0.98 } : undefined}
            >
                {children}
            </motion.div>
        )
    }

    return <div className={combinedClasses}>{children}</div>
}

/**
 * 애니메이션이 적용된 카드 컴포넌트
 */
export const AnimatedCard = ({
    children,
    delay = 0,
    ...props
}: CardProps & { delay?: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <Card {...props}>{children}</Card>
        </motion.div>
    )
}
