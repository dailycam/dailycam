import { motion } from 'motion/react'
import { Video, TrendingUp, Shield } from 'lucide-react'

export const QuickStartSection = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-10"
        >
            <h2 className="text-xl font-bold mb-4 text-gray-700">빠른 시작</h2>
            <div className="grid lg:grid-cols-3 gap-4">
                <a
                    href="/video-analysis"
                    className="card p-6 bg-gradient-to-br from-cyan-100 to-blue-100 border-0 hover:shadow-lg transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-cyan-700 mb-1">분석하기</p>
                            <h3 className="text-xl font-bold text-cyan-800">영상 분석</h3>
                        </div>
                        <Video className="w-8 h-8 text-cyan-600 group-hover:scale-110 transition-transform" />
                    </div>
                </a>
                <a
                    href="/development-report"
                    className="card p-6 bg-gradient-to-br from-blue-100 to-indigo-100 border-0 hover:shadow-lg transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-700 mb-1">발달 분석</p>
                            <h3 className="text-xl font-bold text-blue-800">발달 리포트</h3>
                        </div>
                        <TrendingUp className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
                    </div>
                </a>
                <a
                    href="/safety-report"
                    className="card p-6 bg-gradient-to-br from-green-100 to-emerald-100 border-0 hover:shadow-lg transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-700 mb-1">안전 분석</p>
                            <h3 className="text-xl font-bold text-green-800">안전 리포트</h3>
                        </div>
                        <Shield className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
                    </div>
                </a>
            </div>
        </motion.div>
    )
}
