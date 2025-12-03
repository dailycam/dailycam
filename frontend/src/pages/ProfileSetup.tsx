import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthToken } from '../lib/auth'
import { Baby, Phone, Calendar } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function ProfileSetup() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        phone: '',
        child_name: '',
        child_birthdate: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {}

        // 전화번호 검증 (한국 전화번호 형식)
        const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
        if (!formData.phone) {
            newErrors.phone = '전화번호를 입력해주세요'
        } else if (!phoneRegex.test(formData.phone.replace(/-/g, ''))) {
            newErrors.phone = '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)'
        }

        // 아이 이름 검증
        if (!formData.child_name || formData.child_name.trim().length === 0) {
            newErrors.child_name = '아이 이름을 입력해주세요'
        } else if (formData.child_name.trim().length < 2) {
            newErrors.child_name = '이름은 최소 2자 이상이어야 합니다'
        }

        // 생년월일 검증
        if (!formData.child_birthdate) {
            newErrors.child_birthdate = '생년월일을 선택해주세요'
        } else {
            const birthDate = new Date(formData.child_birthdate)
            const today = new Date()
            if (birthDate > today) {
                newErrors.child_birthdate = '미래 날짜는 선택할 수 없습니다'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)

        try {
            const token = getAuthToken()
            if (!token) {
                alert('로그인이 필요합니다')
                navigate('/login')
                return
            }

            const response = await fetch(`${API_BASE_URL}/api/profile/setup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || '프로필 등록에 실패했습니다')
            }

            alert('프로필이 성공적으로 등록되었습니다!')
            navigate('/dashboard')
        } catch (error) {
            console.error('프로필 등록 오류:', error)
            alert(error instanceof Error ? error.message : '프로필 등록 중 오류가 발생했습니다')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // 입력 시 해당 필드의 에러 제거
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-cream-50 via-primary-50/30 to-cyan-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/50 p-10">
                    {/* 헤더 */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Baby className="w-8 h-8 text-primary-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">프로필 설정</h1>
                        <p className="text-sm text-gray-500">
                            아이의 정보를 등록하여<br />맞춤형 서비스를 시작하세요
                        </p>
                    </div>

                    {/* 폼 */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* 전화번호 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Phone className="w-4 h-4 inline mr-1" />
                                전화번호
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="010-1234-5678"
                                className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-300' : 'border-gray-200'
                                    } focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                            />
                            {errors.phone && (
                                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                            )}
                        </div>

                        {/* 아이 이름 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Baby className="w-4 h-4 inline mr-1" />
                                아이 이름
                            </label>
                            <input
                                type="text"
                                name="child_name"
                                value={formData.child_name}
                                onChange={handleChange}
                                placeholder="예: 지우"
                                className={`w-full px-4 py-3 rounded-xl border ${errors.child_name ? 'border-red-300' : 'border-gray-200'
                                    } focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                            />
                            {errors.child_name && (
                                <p className="text-xs text-red-500 mt-1">{errors.child_name}</p>
                            )}
                        </div>

                        {/* 생년월일 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                아이 생년월일
                            </label>
                            <input
                                type="date"
                                name="child_birthdate"
                                value={formData.child_birthdate}
                                onChange={handleChange}
                                max={new Date().toISOString().split('T')[0]}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.child_birthdate ? 'border-red-300' : 'border-gray-200'
                                    } focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                            />
                            {errors.child_birthdate && (
                                <p className="text-xs text-red-500 mt-1">{errors.child_birthdate}</p>
                            )}
                        </div>

                        {/* 제출 버튼 */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {isSubmitting ? '등록 중...' : '프로필 등록하기'}
                        </button>
                    </form>

                    {/* 안내 문구 */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-400">
                            입력하신 정보는 안전하게 보관되며,<br />
                            서비스 개선 목적으로만 사용됩니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
