import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Film, FileVideo, ArrowRight } from 'lucide-react'

export default function ClipHighlights() {
  const navigate = useNavigate()
  const [clips] = useState<any[]>([]) // 향후 DB 연동 시 사용
  const [loading] = useState(false)

  // 데이터 없음 화면 (클립 기능은 향후 구현)
  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Film className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">클립 하이라이트</h1>
        </div>
        <p className="text-gray-600">AI가 자동으로 생성한 중요한 순간들을 확인하세요</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex items-center justify-center min-h-[500px]"
      >
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary-100 to-cyan-100 rounded-full flex items-center justify-center mb-4">
              <FileVideo className="w-12 h-12 text-primary-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">클립 데이터가 없습니다</h2>
          <p className="text-gray-600 mb-8">
            비디오를 분석하면 AI가 자동으로 중요한 순간을 클립으로 생성합니다.
            <br />
            발달 이정표와 안전 이벤트가 하이라이트로 저장됩니다.
          </p>
          <button
            onClick={() => navigate('/video-analysis-test')}
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <FileVideo className="w-5 h-5" />
            비디오 분석하러 가기
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
