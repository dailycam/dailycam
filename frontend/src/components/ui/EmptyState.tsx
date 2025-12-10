import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { Card } from './Card'

interface EmptyStateProps {
    icon?: LucideIcon
    title?: string
    description?: string
    action?: ReactNode
    className?: string
}

/**
 * 데이터가 없을 때 표시하는 빈 상태 컴포넌트
 */
export const EmptyState = ({
    icon: Icon,
    title = '데이터가 없습니다',
    description = '아직 분석된 데이터가 없습니다. 영상을 업로드하면 AI가 분석합니다.',
    action,
    className = '',
}: EmptyStateProps) => {
    return (
        <Card className={`flex flex-col items-center justify-center py-12 ${className}`}>
            {Icon && (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-gray-400" />
                </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">{description}</p>
            {action && <div className="mt-2">{action}</div>}
        </Card>
    )
}

/**
 * 카드 섹션용 작은 빈 상태 컴포넌트
 */
export const EmptyCard = ({
    icon: Icon,
    message = '분석된 데이터가 없습니다',
}: {
    icon?: LucideIcon
    message?: string
}) => {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6">
            {Icon && (
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-gray-400" />
                </div>
            )}
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    )
}
