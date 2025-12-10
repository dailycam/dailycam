import { useState } from 'react'

interface AdvancedSettingsProps {
    ageMonths: number | undefined
    setAgeMonths: (age: number | undefined) => void
    temperature: number
    setTemperature: (temp: number) => void
    topK: number
    setTopK: (k: number) => void
    topP: number
    setTopP: (p: number) => void
    isAnalyzing: boolean
}

export const AdvancedSettings = ({
    ageMonths,
    setAgeMonths,
    temperature,
    setTemperature,
    topK,
    setTopK,
    topP,
    setTopP,
    isAnalyzing,
}: AdvancedSettingsProps) => {
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

    return (
        <div className="space-y-4">
            {/* 개월 수 선택 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    아이의 개월 수 (선택사항)
                </label>
                <input
                    type="number"
                    min="0"
                    max="36"
                    value={ageMonths || ''}
                    onChange={(e) =>
                        setAgeMonths(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="개월 수를 입력하세요"
                    disabled={isAnalyzing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                    개월 수를 입력하면 발달 단계 판단에 참고로 사용됩니다. 입력하지 않으면 영상만으로
                    판단합니다.
                </p>
            </div>

            {/* 고급 설정 (AI 파라미터 튜닝) */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">고급 설정 (AI 파라미터 튜닝)</h3>
                    <button
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                    >
                        {showAdvancedSettings ? '숨기기' : '표시하기'}
                    </button>
                </div>

                {showAdvancedSettings && (
                    <div className="space-y-4 pt-2 border-t border-gray-100">
                        {/* 프리셋 버튼 */}
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => {
                                    setTemperature(0.2)
                                    setTopK(10)
                                    setTopP(0.7)
                                }}
                                className="flex-1 px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
                            >
                                Set A (보수적)
                                <div className="text-[10px] text-gray-500 font-normal mt-0.5">정확성 중심</div>
                            </button>
                            <button
                                onClick={() => {
                                    setTemperature(0.4)
                                    setTopK(30)
                                    setTopP(0.8)
                                }}
                                className="flex-1 px-3 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                            >
                                Set B (밸런스)
                                <div className="text-[10px] text-blue-500 font-normal mt-0.5">공감+팩트</div>
                            </button>
                            <button
                                onClick={() => {
                                    setTemperature(0.8)
                                    setTopK(80)
                                    setTopP(1.0)
                                }}
                                className="flex-1 px-3 py-2 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors border border-purple-200"
                            >
                                Set C (창의적)
                                <div className="text-[10px] text-purple-500 font-normal mt-0.5">풍부한 표현</div>
                            </button>
                        </div>

                        {/* Temperature */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-gray-700">
                                    Temperature (창의성): {temperature}
                                </label>
                                <span className="text-xs text-gray-500">0.0 ~ 1.0</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={temperature}
                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                낮을수록 사실적이고 일관된 답변, 높을수록 창의적이고 다양한 답변
                            </p>
                        </div>

                        {/* Top K */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-gray-700">
                                    Top K (어휘 다양성): {topK}
                                </label>
                                <span className="text-xs text-gray-500">1 ~ 40</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="40"
                                step="1"
                                value={topK}
                                onChange={(e) => setTopK(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                다음 단어 선택 시 고려할 후보군의 크기
                            </p>
                        </div>

                        {/* Top P */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-gray-700">
                                    Top P (문장 자연스러움): {topP}
                                </label>
                                <span className="text-xs text-gray-500">0.0 ~ 1.0</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={topP}
                                onChange={(e) => setTopP(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                누적 확률 분포를 기반으로 한 샘플링 (높을수록 자연스러움)
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
