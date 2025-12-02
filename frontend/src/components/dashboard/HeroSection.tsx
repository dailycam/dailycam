import { motion } from 'motion/react'

interface HeroSectionProps {
    childName?: string
    summary?: string
}

export const HeroSection: React.FC<HeroSectionProps> = ({
    childName = "지수",
    summary = "오늘 하루도 건강하고 안전하게 보냈어요. 특히 배밀이 연습에서 큰 진전을 보였답니다 🎉"
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
        >
            <div className="mb-6">
                <p className="text-gray-500 mb-1">오늘도 함께해요</p>
                <h1 className="text-4xl mb-2 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent">
                    {childName}는 기분이 아주 좋아요!
                </h1>
                <p className="text-gray-600 leading-relaxed">
                    {summary}
                </p>
            </div>
        </motion.div>
    )
}
