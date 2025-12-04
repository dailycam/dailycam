import { useState, useEffect, useRef } from 'react'
import { analyzeVideoWithBackend } from '../../../lib/api'
import { useAnalysis } from '../../../context/AnalysisContext'

export const useVideoAnalysis = () => {
    const { analysisResult, setAnalysisResult } = useAnalysis()

    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisProgress, setAnalysisProgress] = useState(0)
    const [analysisError, setAnalysisError] = useState<string | null>(null)
    const [ageMonths, setAgeMonths] = useState<number | undefined>(undefined)

    // AI 파라미터 설정 상태
    const [temperature, setTemperature] = useState(0.4)
    const [topK, setTopK] = useState(30)
    const [topP, setTopP] = useState(0.95)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // 비디오 미리보기 URL 정리 (메모리 누수 방지)
    useEffect(() => {
        return () => {
            if (videoPreviewUrl) {
                URL.revokeObjectURL(videoPreviewUrl)
            }
        }
    }, [videoPreviewUrl])

    // 비디오 파일 선택 핸들러
    const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            // 비디오 파일인지 확인
            if (!file.type.startsWith('video/')) {
                setAnalysisError('비디오 파일만 업로드 가능합니다.')
                return
            }

            // 이전 비디오 미리보기 URL 정리
            if (videoPreviewUrl) {
                URL.revokeObjectURL(videoPreviewUrl)
            }

            // 상태 완전히 초기화
            setVideoFile(file)
            setAnalysisError(null)
            setAnalysisResult(null)
            setAnalysisProgress(0)
            setIsAnalyzing(false)

            // 비디오 미리보기 URL 생성
            const url = URL.createObjectURL(file)
            setVideoPreviewUrl(url)
        }
    }

    // 비디오 분석 시작
    const handleAnalyzeVideo = async () => {
        if (!videoFile) return

        // 이전 분석 결과 완전히 정리
        setAnalysisResult(null)
        setAnalysisError(null)
        setAnalysisProgress(0)
        setIsAnalyzing(true)

        let progressInterval: NodeJS.Timeout | null = null
        let timeoutId: NodeJS.Timeout | null = null

        try {
            // 진행 상태 시뮬레이션
            progressInterval = setInterval(() => {
                setAnalysisProgress(prev => {
                    if (prev >= 90) {
                        return 90
                    }
                    return prev + 10
                })
            }, 500)

            // 타임아웃 설정 (5분)
            timeoutId = setTimeout(() => {
                if (progressInterval) {
                    clearInterval(progressInterval)
                }
                setAnalysisError('비디오 분석이 시간 초과되었습니다. 파일 크기를 확인하거나 다시 시도해주세요.')
                setIsAnalyzing(false)
                setAnalysisProgress(0)
            }, 5 * 60 * 1000) // 5분

            // 백엔드 API 호출 (VLM 프롬프트 분석)
            console.log('[분석 시작] VLM 비디오 분석 API 호출 (자동 발달 단계 판단)...')
            console.log(`[AI 설정] Temp: ${temperature}, TopK: ${topK}, TopP: ${topP}`)
            const result = await analyzeVideoWithBackend(videoFile, {
                ageMonths,
                temperature,
                topK,
                topP,
            })

            // 타임아웃 정리
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
            }
            if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
            }

            setAnalysisProgress(100)
            // 분석 결과를 깊은 복사하여 설정 (이전 객체 참조 제거)
            try {
                const cleanResult = JSON.parse(JSON.stringify(result))
                setAnalysisResult(cleanResult)
                console.log('[분석 완료] 비디오 분석 성공:', cleanResult)
            } catch (parseError) {
                console.error('[분석 결과 파싱 오류]', parseError)
                setAnalysisResult(result)
            }
        } catch (error: any) {
            console.error('분석 오류:', error)
            setAnalysisError(error.message || '비디오 분석 중 오류가 발생했습니다. 백엔드 서버를 확인해주세요.')
        } finally {
            if (progressInterval) {
                clearInterval(progressInterval)
            }
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            setIsAnalyzing(false)
        }
    }

    // 파일 선택 버튼 클릭
    const handleUploadClick = () => {
        fileInputRef.current?.click()
    }

    // 분석 초기화
    const handleReset = () => {
        if (videoPreviewUrl) {
            URL.revokeObjectURL(videoPreviewUrl)
        }

        setVideoFile(null)
        setVideoPreviewUrl(null)
        setAnalysisResult(null)
        setAnalysisError(null)
        setAnalysisProgress(0)
        setAgeMonths(undefined)

        // AI 파라미터 초기화
        setTemperature(0.4)
        setTopK(30)
        setTopP(0.95)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return {
        videoFile,
        videoPreviewUrl,
        isAnalyzing,
        analysisProgress,
        analysisError,
        ageMonths,
        setAgeMonths,
        temperature,
        setTemperature,
        topK,
        setTopK,
        topP,
        setTopP,
        fileInputRef,
        handleVideoSelect,
        handleAnalyzeVideo,
        handleUploadClick,
        handleReset,
        analysisResult
    }
}
