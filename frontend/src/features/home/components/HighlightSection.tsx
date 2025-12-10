import { motion } from 'motion/react'
import { Sparkles, Video, PlayCircle } from 'lucide-react'
import { HighlightMoment } from '../types'

interface HighlightSectionProps {
    userInfo: { child_name?: string } | null
    moments: HighlightMoment[]
}

export const HighlightSection = ({ userInfo, moments }: HighlightSectionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10"
        >
            <div className="card p-8 bg-gradient-to-br from-white via-green-50 to-emerald-50 border-0 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{userInfo?.child_name || '우리 아이'}의 하루</h2>
                        <p className="text-sm text-gray-600">오늘의 특별한 순간</p>
                    </div>
                </div>

                {/* 오늘의 하이라이트 3장 (썸네일 이미지) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {moments.map((moment, index) => (
                        <motion.div
                            key={moment.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group border border-green-100"
                        >
                            {/* 썸네일 이미지 */}
                            <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                {/* 임시 플레이스홀더 - 실제로는 캡처된 이미지 */}
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Video className="w-16 h-16" />
                                </div>
                                {/* 시간 오버레이 */}
                                <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                                    {moment.time}
                                </div>
                                {/* 재생 아이콘 */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <PlayCircle className="w-12 h-12 text-white" />
                                </div>
                            </div>
                            {/* 설명 */}
                            <div className="p-4">
                                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                                    {moment.title}
                                </h3>
                                <p className="text-sm text-gray-600">{moment.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
