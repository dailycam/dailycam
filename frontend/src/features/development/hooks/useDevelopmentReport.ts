import { useState, useEffect } from 'react'
import { getDevelopmentData, DevelopmentData } from '../../../lib/api'
import { getAuthToken } from '../../../lib/auth'
import { RadarDataItem } from '../types'

export const useDevelopmentReport = () => {
    const [date] = useState<Date>(new Date())
    const [developmentData, setDevelopmentData] = useState<DevelopmentData | null>(null)
    const [childName, setChildName] = useState<string>('우리 아이')

    // 사용자 정보 가져오기
    useEffect(() => {
        const fetchUserInfo = async () => {
            const token = getAuthToken()
            if (!token) return

            try {
                const response = await fetch('http://localhost:8000/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (response.ok) {
                    const data = await response.json()
                    setChildName(data.child_name || '우리 아이')
                }
            } catch (error) {
                console.error('사용자 정보 로드 실패:', error)
            }
        }
        fetchUserInfo()
    }, [])

    // API에서 데이터 로드
    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getDevelopmentData(7)
                setDevelopmentData(data)
            } catch (error) {
                console.error('발달 데이터 로드 실패:', error)
            }
        }

        loadData()
    }, [])

    // 로딩 중이거나 데이터가 없으면 기본값 사용
    const radarData: RadarDataItem[] = developmentData
        ? Object.entries(developmentData.developmentRadarScores).map(([category, score]) => ({
            category,
            score,
            average: 70, // 또래 평균을 70점으로 고정
            fullMark: 100,
        }))
        : [
            { category: '언어', score: 0, average: 70, fullMark: 100 },
            { category: '운동', score: 0, average: 75, fullMark: 100 },
            { category: '인지', score: 0, average: 72, fullMark: 100 },
            { category: '사회성', score: 0, average: 68, fullMark: 100 },
            { category: '정서', score: 0, average: 73, fullMark: 100 },
        ]

    // 최고점수를 가진 영역 찾기
    const maxScore = Math.max(...radarData.map(item => item.score))
    const strongestArea = radarData.find(item => item.score === maxScore)

    const dailyDevelopmentFrequency = developmentData?.dailyDevelopmentFrequency || [
        { category: '언어', count: 0, color: '#14b8a6' },
        { category: '운동', count: 0, color: '#86d5a8' },
        { category: '인지', count: 0, color: '#ffdb8b' },
        { category: '사회성', count: 0, color: '#5fe9d0' },
        { category: '정서', count: 0, color: '#99f6e0' },
    ]

    return {
        date,
        developmentData,
        radarData,
        strongestArea,
        dailyDevelopmentFrequency,
        childName
    }
}
