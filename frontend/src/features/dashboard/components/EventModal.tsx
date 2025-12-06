import { motion } from 'motion/react'
import { Video } from 'lucide-react'

import { TimelineEvent } from '../types'

interface EventModalProps {
    isOpen: boolean
    onClose: () => void
    events: TimelineEvent[]
    timeRange: string | null
    category: string | null
}

export const EventModal: React.FC<EventModalProps> = ({
    isOpen,
    onClose,
    events,
    timeRange,
    category
}) => {
    if (!isOpen || events.length === 0) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col m-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 모달 헤더 */}
                <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-cyan-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">상세 활동 내역</h3>
                            <p className="text-sm text-gray-600 mt-0.5">
                                {timeRange} · {category} · {events.length}건
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-600"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* 리스트 (스크롤) */}
                <div className="p-5 overflow-y-auto flex-1 space-y-3">
                    {events.map((event, i) => {
                        const bgColor = event.severity === 'danger'
                            ? 'bg-red-50 border-red-200'
                            : event.severity === 'warning'
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-gray-50 border-gray-200'

                        const textColor = event.severity === 'danger'
                            ? 'text-danger-600'
                            : event.severity === 'warning'
                                ? 'text-warning-600'
                                : 'text-gray-700'

                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`border rounded-xl p-4 ${bgColor}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`font-semibold text-base ${textColor}`}>
                                        {event.title}
                                    </span>
                                    <span className="text-sm font-medium text-gray-500 ml-2">
                                        {event.time}
                                    </span>
                                </div>
                                {event.description && (
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {event.description}
                                    </p>
                                )}
                                {event.thumbnailUrl && (
                                    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                                        <img
                                            src={event.thumbnailUrl}
                                            alt={event.title}
                                            className="w-full h-48 object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                                {(event.hasClip || event.videoUrl) && (
                                    <div className="mt-3 pt-3 border-t border-gray-300/50">
                                        <button
                                            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                            onClick={() => {
                                                if (event.videoUrl) {
                                                    window.open(event.videoUrl, '_blank');
                                                }
                                            }}
                                        >
                                            <Video className="w-4 h-4" />
                                            영상 보기
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-xl transition-all"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    )
}
