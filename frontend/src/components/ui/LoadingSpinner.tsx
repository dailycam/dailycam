interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    text?: string
    fullScreen?: boolean
}

const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
}

/**
 * 로딩 스피너 컴포넌트
 */
export const LoadingSpinner = ({
    size = 'md',
    text = '로딩 중...',
    fullScreen = false,
}: LoadingSpinnerProps) => {
    const sizeClass = sizeClasses[size]

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <div
                className={`${sizeClass} animate-spin rounded-full border-primary-200 border-t-primary-600`}
            />
            {text && <p className="text-gray-600 text-sm">{text}</p>}
        </div>
    )

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
                {spinner}
            </div>
        )
    }

    return <div className="flex items-center justify-center h-64">{spinner}</div>
}

/**
 * 인라인 로딩 스피너 (작은 크기)
 */
export const InlineSpinner = () => {
    return (
        <div className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    )
}
