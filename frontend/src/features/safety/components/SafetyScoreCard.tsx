import { motion } from 'framer-motion';
import { Shield, Award } from 'lucide-react';

interface SafetyScoreCardProps {
    currentSafetyScore: number;
}

export const SafetyScoreCard = ({ currentSafetyScore }: SafetyScoreCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
        >
            <div className="card p-6 bg-gradient-to-br from-primary-100/40 to-cyan-50/30 border-0 h-full">
                <div className="text-center h-full flex flex-col justify-center">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                    </motion.div>
                    <p className="text-sm text-gray-600 mb-2">오늘의 종합 안전 점수</p>
                    <p className="text-primary-600 mb-4 text-4xl font-bold">{currentSafetyScore}점</p>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-green-600" />
                            <p className="text-sm text-gray-700 font-medium">안전 상태</p>
                        </div>
                        <p className="text-base text-gray-800 leading-relaxed">
                            <span className="text-primary-600 font-semibold">
                                {currentSafetyScore >= 90 ? '매우 우수' : currentSafetyScore >= 70 ? '양호' : '주의'}
                            </span>합니다.
                        </p>
                    </div>

                    <div className="mt-4 text-xs text-gray-400 border-t pt-3">
                        <p>💡 24시간 감지 데이터 기반의 분석 결과입니다.</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
