import { ReactNode, ButtonHTMLAttributes } from 'react'
import { LucideIcon } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    icon?: LucideIcon
    iconPosition?: 'left' | 'right'
    fullWidth?: boolean
    loading?: boolean
}

const variantClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-md',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
}

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
}

/**
 * 재사용 가능한 버튼 컴포넌트
 */
export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    loading = false,
    disabled,
    className = '',
    ...props
}: ButtonProps) => {
    const baseClasses = 'rounded-lg font-medium transition-all flex items-center justify-center gap-2'
    const variantClass = variantClasses[variant]
    const sizeClass = sizeClasses[size]
    const widthClass = fullWidth ? 'w-full' : ''
    const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : ''

    const combinedClasses = `${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${disabledClass} ${className}`

    return (
        <button
            className={combinedClasses}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>처리 중...</span>
                </>
            ) : (
                <>
                    {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
                    {children}
                    {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
                </>
            )}
        </button>
    )
}
