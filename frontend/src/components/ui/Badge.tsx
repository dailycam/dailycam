import { ReactNode } from 'react'

interface BadgeProps {
    children: ReactNode
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'default'
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const variantClasses = {
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    default: 'bg-gray-100 text-gray-700 border-gray-200',
}

const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
}

/**
 * 재사용 가능한 배지 컴포넌트
 */
export const Badge = ({
    children,
    variant = 'default',
    size = 'sm',
    className = '',
}: BadgeProps) => {
    const baseClasses = 'inline-flex items-center rounded-full font-semibold border'
    const variantClass = variantClasses[variant]
    const sizeClass = sizeClasses[size]

    const combinedClasses = `${baseClasses} ${variantClass} ${sizeClass} ${className}`

    return <span className={combinedClasses}>{children}</span>
}

/**
 * 안전도 레벨 배지
 */
export const SafetyBadge = ({ level }: { level: string }) => {
    const getVariant = (level: string): BadgeProps['variant'] => {
        if (level === '매우높음' || level === '높음') return 'success'
        if (level === '중간') return 'warning'
        return 'danger'
    }

    const getText = (level: string): string => {
        if (level === '매우높음') return '매우 안전'
        if (level === '높음') return '안전'
        if (level === '중간') return '주의'
        if (level === '낮음') return '위험'
        return '매우 위험'
    }

    return <Badge variant={getVariant(level)}>{getText(level)}</Badge>
}

/**
 * 우선순위 배지
 */
export const PriorityBadge = ({ priority }: { priority: 'high' | 'medium' | 'low' | '권장' }) => {
    const getVariant = (priority: string): BadgeProps['variant'] => {
        if (priority === 'high') return 'danger'
        if (priority === 'medium') return 'warning'
        if (priority === '권장') return 'info'
        return 'success'
    }

    const getText = (priority: string): string => {
        if (priority === 'high') return '높은 우선순위'
        if (priority === 'medium') return '중간 우선순위'
        if (priority === 'low') return '낮은 우선순위'
        return '권장사항'
    }

    return <Badge variant={getVariant(priority)}>{getText(priority)}</Badge>
}
