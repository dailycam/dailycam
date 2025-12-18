import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  User as UserIcon,
  Bell,
  Shield,
  CreditCard,
  Camera,
  Globe,
  Save,
  Upload,
  Trash2,
  Video,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
} from 'lucide-react'
import { removeAuthToken } from '../lib/auth'
import { API_BASE_URL } from '@/constants/api'
import { getUserCameras, uploadCameraVideo, deleteCameraVideo, getStorageUsage, type CameraSetting } from '@/lib/api'
import {
  getNotifications,
  deleteNotification,
  clearAllNotifications,
  markAllAsRead,
  formatAbsoluteTime,
  formatRelativeTime,
  addNotification,
  type StoredNotification
} from '@/lib/notifications'



type Section =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'camera'
  | 'subscription'
  | 'locale'

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()

  // Sidebar에서 navigate('/settings', { state: { section: 'subscription' } }) 로 오면
  // 기본 탭을 'subscription'으로 열어줌
  const initialSection: Section =
    ((location.state as { section?: Section } | null)?.section) ?? 'profile'

  const { user: userInfo, refreshUser } = useAuth()
  const [activeSection, setActiveSection] = useState<Section>(initialSection)
  const [isCancelling, setIsCancelling] = useState(false)

  // 프로필 편집 상태
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    child_name: '',
    child_birthdate: '',
    picture: ''
  })

  const [notificationLogs, setNotificationLogs] = useState<StoredNotification[]>([])
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'checklist_completed' | 'system' | 'analysis'>('all')

  // 카메라 설정 상태
  const [cameras, setCameras] = useState<CameraSetting[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [storageUsage, setStorageUsage] = useState<{
    total_size_gb: number
    max_size_gb: number
    usage_percent: number
    video_count: number
    remaining_gb: number
  } | null>(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  useEffect(() => {
    const sectionFromState =
      (location.state as { section?: Section } | null)?.section
    if (sectionFromState && sectionFromState !== activeSection) {
      setActiveSection(sectionFromState)
    }
  }, [location.state, activeSection])


  // 사용자 정보가 변경되면 프로필 폼 초기화
  useEffect(() => {
    if (userInfo) {
      setProfileForm({
        name: userInfo.name || '',
        phone: userInfo.phone || '',
        child_name: userInfo.child_name || '',
        child_birthdate: userInfo.child_birthdate || '',
        picture: userInfo.picture || ''
      })
    }
  }, [userInfo])

  // 카메라 설정 가져오기
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const result = await getUserCameras()
        setCameras(result.cameras)

        // 카메라가 있으면 첫 번째 카메라 선택
        if (result.cameras.length > 0) {
          if (!selectedCameraId) {
            setSelectedCameraId(result.cameras[0].camera_id)
          }
        } else {
          // 카메라가 없으면(로컬 테스트 등) 기본값 'camera-1' 설정
          if (!selectedCameraId) {
             setSelectedCameraId('camera-1')
          }
        }
      } catch (error) {
        console.error('카메라 설정 조회 오류:', error)
         // 에러 발생 시에도 기본값 설정 (로컬 테스트 편의성)
         if (!selectedCameraId) {
            setSelectedCameraId('camera-1')
         }
      }
    }

    const fetchStorage = async () => {
      try {
        const usage = await getStorageUsage()
        setStorageUsage(usage)
      } catch (error) {
        console.error('저장 공간 조회 오류:', error)
      }
    }

    if (activeSection === 'camera') {
      fetchCameras()
      fetchStorage()
    }

    if (activeSection === 'notifications') {
      loadNotificationLogs()
    }
  }, [activeSection, selectedCameraId])

  // 알림 로그 로드
  const loadNotificationLogs = () => {
    const logs = getNotifications()
    setNotificationLogs(logs)
  }

  // 알림 삭제 핸들러
  const handleDeleteNotification = (id: string) => {
    deleteNotification(id)
    loadNotificationLogs()
  }

  // 모든 알림 삭제
  const handleClearAllNotifications = () => {
    if (confirm('모든 알림을 삭제하시겠습니까?')) {
      clearAllNotifications()
      loadNotificationLogs()
    }
  }

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = () => {
    markAllAsRead()
    loadNotificationLogs()
  }

  // 알림 타입별 아이콘
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'checklist_completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'system':
        return <Info className="w-5 h-5 text-blue-500" />
      case 'analysis':
        return <AlertCircle className="w-5 h-5 text-amber-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  // 알림 타입별 라벨
  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'checklist_completed':
        return '체크리스트'
      case 'system':
        return '시스템'
      case 'analysis':
        return '분석'
      default:
        return '기타'
    }
  }

  // 필터링된 알림
  const filteredNotifications = selectedFilter === 'all'
    ? notificationLogs
    : notificationLogs.filter(n => n.type === selectedFilter)

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 크기는 10MB 이하여야 합니다')
      return
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다')
      return
    }

    // 이미지를 Base64로 변환
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result as string

      try {
        // 즉시 서버에 저장
        const response = await fetch(`${API_BASE_URL}/api/profile/setup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            ...profileForm,
            picture: base64String
          }),
        })

        if (!response.ok) {
          throw new Error('사진 업데이트에 실패했습니다')
        }

        // 사용자 정보 다시 가져오기
        await refreshUser()

        alert('프로필 사진이 변경되었습니다!')
      } catch (error) {
        console.error('사진 변경 오류:', error)
        alert('사진 변경 중 오류가 발생했습니다')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCancelSubscription = async () => {
    if (!userInfo) return

    if (!window.confirm('정말 구독을 해지하시겠어요? 다음 결제일부터 서비스 이용이 중단됩니다.')) {
      return
    }

    try {
      setIsCancelling(true)
      const res = await fetch(`${API_BASE_URL}/api/payments/subscribe/basic/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('cancel error:', err)
        alert('구독 해지 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        return
      }

      await res.json().catch(() => null)

      // ✅ 구독 정보(플랜, 남은 기간)는 그대로 두고,
      //    필요하면 안내 텍스트만 바꾸는 용도로 쓸 수 있음
      // 사용자 정보 새로고침
      await refreshUser()

      // 사이드바 등 다른 컴포넌트에 알려주기 (여전히 남은 기간은 보이게 됨)
      window.dispatchEvent(new Event('subscriptionChanged'))

      alert('구독 자동결제가 해지되었습니다. 남은 이용 기간 동안은 계속 사용 가능합니다.')
    } catch (e) {
      console.error(e)
      alert('구독 해지 중 오류가 발생했습니다.')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleSaveProfile = async () => {
    // 유효성 검사
    if (!profileForm.name || profileForm.name.trim().length < 2) {
      alert('이름은 최소 2자 이상이어야 합니다')
      return
    }

    if (profileForm.phone && !/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(profileForm.phone.replace(/-/g, ''))) {
      alert('올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)')
      return
    }

    if (profileForm.child_name && profileForm.child_name.trim().length < 2) {
      alert('아이 이름은 최소 2자 이상이어야 합니다')
      return
    }

    if (profileForm.child_birthdate) {
      const birthDate = new Date(profileForm.child_birthdate)
      const today = new Date()
      if (birthDate > today) {
        alert('미래 날짜는 선택할 수 없습니다')
        return
      }
    }

    try {
      setIsSavingProfile(true)

      // 프로필 업데이트 API 호출
      const response = await fetch(`${API_BASE_URL}/api/profile/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '프로필 업데이트에 실패했습니다')
      }

      // 사용자 정보 다시 가져오기
      await refreshUser()
      if (userInfo) {
        setProfileForm({
          name: userInfo.name || '',
          phone: userInfo.phone || '',
          child_name: userInfo.child_name || '',
          child_birthdate: userInfo.child_birthdate || '',
          picture: userInfo.picture || ''
        })
      }

      setIsEditingProfile(false)
      alert('프로필이 성공적으로 업데이트되었습니다!')
    } catch (error) {
      console.error('프로필 저장 오류:', error)
      alert(error instanceof Error ? error.message : '프로필 저장 중 오류가 발생했습니다')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleCancelEdit = () => {
    // 편집 취소 시 원래 값으로 복원
    if (userInfo) {
      setProfileForm({
        name: userInfo.name || '',
        phone: userInfo.phone || '',
        child_name: userInfo.child_name || '',
        child_birthdate: userInfo.child_birthdate || '',
        picture: userInfo.picture || ''
      })
    }
    setIsEditingProfile(false)
  }

  const calculateAgeInMonths = (birthdate: string | null | undefined): string => {
    if (!birthdate) return ''

    const birth = new Date(birthdate)
    const today = new Date()

    const yearDiff = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    const dayDiff = today.getDate() - birth.getDate()

    let totalMonths = yearDiff * 12 + monthDiff

    // 날짜가 아직 안 지났으면 한 달 빼기
    if (dayDiff < 0) {
      totalMonths -= 1
    }

    if (totalMonths < 0) return '0개월'
    if (totalMonths === 0) return '0개월'

    return `${totalMonths}개월`
  }

  // 영상 업로드 핸들러
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 현재 선택된 카메라 ID 확인 및 기본값 처리
    let activeCameraId = selectedCameraId
    if (!activeCameraId) {
      activeCameraId = 'camera-1'
      setSelectedCameraId(activeCameraId)
    }

    // 파일 검증
    if (!file.type.startsWith('video/')) {
      alert('비디오 파일만 업로드 가능합니다')
      return
    }

    // 파일 크기 제한 (500MB)
    if (file.size > 500 * 1024 * 1024) {
      alert('파일 크기는 500MB 이하여야 합니다')
      return
    }

    try {
      setIsUploadingVideo(true)
      setUploadProgress(0)

      // 진행률 시뮬레이션 (실제 업로드 진행률은 FormData로는 추적 불가)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      await uploadCameraVideo(activeCameraId, file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // 카메라 목록 새로고침
      const result = await getUserCameras()
      setCameras(result.cameras)

      // 저장 공간 사용량 새로고침
      const usage = await getStorageUsage()
      setStorageUsage(usage)

      // 시스템 알림 추가
      addNotification({
        title: '영상 업로드 완료',
        message: `${file.name} 파일이 성공적으로 업로드되었습니다. (${formatFileSize(file.size)})`,
        type: 'system'
      })

      // 저장 공간 부족 경고
      if (usage.usage_percent > 90) {
        addNotification({
          title: '⚠️ 저장 공간 부족',
          message: `저장 공간이 ${usage.usage_percent.toFixed(0)}% 사용되었습니다. 오래된 영상을 삭제해주세요.`,
          type: 'system'
        })
      }

      alert('영상이 성공적으로 업로드되었습니다!')
    } catch (error) {
      console.error('영상 업로드 오류:', error)
      alert(error instanceof Error ? error.message : '영상 업로드 중 오류가 발생했습니다')
    } finally {
      setIsUploadingVideo(false)
      setUploadProgress(0)
      // 파일 인풋 초기화
      event.target.value = ''
    }
  }

  // 영상 삭제 핸들러
  const handleVideoDelete = async (videoId: number, filename: string) => {
    if (!confirm(`"${filename}" 영상을 삭제하시겠습니까?\n\n⚠️ 주의: 해당 카메라의 스트림이 실행 중이면 자동으로 중지됩니다.`)) {
      return
    }

    try {
      await deleteCameraVideo(videoId)

      // 카메라 목록 새로고침
      const result = await getUserCameras()
      setCameras(result.cameras)

      // 저장 공간 사용량 새로고침
      const usage = await getStorageUsage()
      setStorageUsage(usage)

      // 시스템 알림 추가
      addNotification({
        title: '영상 삭제 완료',
        message: `${filename} 파일이 삭제되었습니다. 스트림이 실행 중이었다면 자동으로 중지되었습니다.`,
        type: 'system'
      })

      // 스트림 상태 업데이트를 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('video-deleted'))

      alert('영상이 삭제되었습니다')
    } catch (error) {
      console.error('영상 삭제 오류:', error)
      alert(error instanceof Error ? error.message : '영상 삭제 중 오류가 발생했습니다')
    }
  }

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  // 영상 길이 포맷팅
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '알 수 없음'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }


  const formatNextBillingDate = (iso?: string | null) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '-'
    // 예: 2025.12.11
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // 계정 삭제 핸들러
  const handleDeleteAccount = async () => {
    if (!confirm('⚠️ 정말로 계정을 삭제하시겠습니까?\n\n모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.')) {
      return
    }

    if (!confirm('⚠️ 최종 확인\n\n계정을 삭제하면:\n• 모든 분석 데이터가 삭제됩니다\n• 업로드한 영상이 모두 삭제됩니다\n• 구독이 자동으로 해지됩니다\n• 이 작업은 되돌릴 수 없습니다\n\n정말 계속하시겠습니까?')) {
      return
    }

    try {
      setIsDeletingAccount(true)

      const response = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        credentials: 'include',  // httpOnly Cookie 전송
      })

      if (!response.ok) {
        throw new Error('계정 삭제에 실패했습니다')
      }

      // 로그아웃 처리
      removeAuthToken()
      alert('계정이 성공적으로 삭제되었습니다. 그동안 이용해주셔서 감사합니다.')
      navigate('/login')
    } catch (error) {
      console.error('계정 삭제 오류:', error)
      alert(error instanceof Error ? error.message : '계정 삭제 중 오류가 발생했습니다')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-600 mt-1">계정 및 서비스 설정을 관리하세요</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="card">
          <nav className="space-y-1">
            <SettingsNavItem
              icon={UserIcon}
              label="프로필"
              active={activeSection === 'profile'}
              onClick={() => setActiveSection('profile')}
            />
            <SettingsNavItem
              icon={Bell}
              label="알림"
              active={activeSection === 'notifications'}
              onClick={() => setActiveSection('notifications')}
            />
            <SettingsNavItem
              icon={Shield}
              label="보안 및 개인정보"
              active={activeSection === 'security'}
              onClick={() => setActiveSection('security')}
            />
            <SettingsNavItem
              icon={Camera}
              label="카메라 설정"
              active={activeSection === 'camera'}
              onClick={() => setActiveSection('camera')}
            />
            <SettingsNavItem
              icon={CreditCard}
              label="구독 관리"
              active={activeSection === 'subscription'}
              onClick={() => setActiveSection('subscription')}
            />
            <SettingsNavItem
              icon={Globe}
              label="언어 및 지역"
              active={activeSection === 'locale'}
              onClick={() => setActiveSection('locale')}
            />
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* 프로필 탭 */}
          {activeSection === 'profile' && (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">프로필 정보</h2>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      수정하기
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    {(isEditingProfile ? profileForm.picture : userInfo?.picture) ? (
                      <img
                        src={isEditingProfile ? profileForm.picture : userInfo?.picture || ''}
                        alt={userInfo?.name || '프로필'}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {userInfo?.name?.charAt(0) || '김'}
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePictureChange}
                        className="hidden"
                        id="picture-upload"
                      />
                      <label
                        htmlFor="picture-upload"
                        className="btn-secondary text-sm cursor-pointer inline-block"
                      >
                        사진 변경
                      </label>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG (최대 5MB)</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                    <input
                      type="text"
                      value={isEditingProfile ? profileForm.name : (userInfo?.name || '로딩 중...')}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="input-field"
                      readOnly={!isEditingProfile}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input
                      type="email"
                      value={userInfo?.email || '로딩 중...'}
                      className="input-field bg-gray-50"
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
                    <input
                      type="tel"
                      value={isEditingProfile ? profileForm.phone : (userInfo?.phone || '등록된 전화번호가 없습니다')}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="010-1234-5678"
                      className="input-field"
                      readOnly={!isEditingProfile}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">아이 이름</label>
                    <input
                      type="text"
                      value={isEditingProfile ? profileForm.child_name : (userInfo?.child_name || '등록된 아이 정보가 없습니다')}
                      onChange={(e) => setProfileForm({ ...profileForm, child_name: e.target.value })}
                      placeholder="예: 지우"
                      className="input-field"
                      readOnly={!isEditingProfile}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">아이 생년월일</label>
                    {isEditingProfile ? (
                      <input
                        type="date"
                        value={profileForm.child_birthdate}
                        onChange={(e) => setProfileForm({ ...profileForm, child_birthdate: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        className="input-field"
                      />
                    ) : (
                      <input
                        type="text"
                        value={
                          userInfo?.child_birthdate
                            ? `${new Date(userInfo.child_birthdate).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })} (${calculateAgeInMonths(userInfo.child_birthdate)})`
                            : '등록된 생년월일이 없습니다'
                        }
                        className="input-field"
                        readOnly
                      />
                    )}
                  </div>

                  {isEditingProfile ? (
                    <div className="flex gap-3">
                      <button
                        className="btn-primary flex items-center gap-2 flex-1"
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                      >
                        <Save className="w-4 h-4" />
                        {isSavingProfile ? '저장 중...' : '저장'}
                      </button>
                      <button
                        className="btn-secondary flex-1"
                        onClick={handleCancelEdit}
                        disabled={isSavingProfile}
                      >
                        취소
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 계정 삭제 - 위험 영역 */}
              <div className="card border-red-200 bg-red-50">
                <h2 className="text-lg font-semibold text-red-900 mb-4">⚠️ 위험 영역</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">계정 삭제</p>
                      <p className="text-xs text-gray-600 mt-1">
                        모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="text-sm text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeletingAccount ? '삭제 중...' : '계정 삭제'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 알림 탭 - 로그 형식 */}
          {activeSection === 'notifications' && (
            <div className="space-y-4">
              {/* 헤더 */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">알림 로그</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      체크리스트 완료, 시스템 알림 등의 기록을 확인하세요
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="btn-secondary text-sm"
                      disabled={notificationLogs.length === 0}
                    >
                      모두 읽음
                    </button>
                    <button
                      onClick={handleClearAllNotifications}
                      className="btn-secondary text-sm text-danger hover:bg-danger-50"
                      disabled={notificationLogs.length === 0}
                    >
                      전체 삭제
                    </button>
                  </div>
                </div>

                {/* 필터 */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    전체 ({notificationLogs.length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('checklist_completed')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'checklist_completed'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    체크리스트 ({notificationLogs.filter(n => n.type === 'checklist_completed').length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('system')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'system'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    시스템 ({notificationLogs.filter(n => n.type === 'system').length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('analysis')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFilter === 'analysis'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    분석 ({notificationLogs.filter(n => n.type === 'analysis').length})
                  </button>
                </div>
              </div>

              {/* 알림 목록 */}
              <div className="card">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-2">알림이 없습니다</p>
                    <p className="text-sm text-gray-400">
                      {selectedFilter === 'all'
                        ? '체크리스트를 완료하면 알림이 기록됩니다'
                        : `${getNotificationTypeLabel(selectedFilter)} 알림이 없습니다`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border transition-all hover:shadow-md ${!notification.read
                          ? 'bg-blue-50/50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                          }`}
                      >
                        {/* 아이콘 */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </h3>
                            <span className="flex-shrink-0 text-xs px-2 py-1 bg-white rounded-full border border-gray-200 text-gray-600">
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(notification.timestamp)}
                            </span>
                            <span className="text-gray-400">
                              {formatAbsoluteTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* 삭제 버튼 */}
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 안내 메시지 */}
              <div className="card bg-blue-50 border-blue-200">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">알림 로그 정보</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 알림은 최대 100개까지 저장됩니다</li>
                      <li>• 오래된 알림은 자동으로 삭제됩니다</li>
                      <li>• 우측 상단 종 아이콘에서 최근 10개 알림을 확인할 수 있습니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 보안 탭 */}
          {activeSection === 'security' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">보안 및 개인정보</h2>
              <p className="text-sm text-gray-600">보안 및 개인정보 설정 기능은 추후 추가될 예정입니다.</p>
            </div>
          )}

          {/* 카메라 설정 탭 */}
          {activeSection === 'camera' && (
            <div className="space-y-6">
              {/* 저장 공간 사용량 */}
              {storageUsage && (
                <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">💾 저장 공간 사용량</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-800">사용 중</span>
                      <span className="font-semibold text-blue-900">
                        {storageUsage.total_size_gb.toFixed(2)} GB / {storageUsage.max_size_gb} GB
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${storageUsage.usage_percent > 90
                          ? 'bg-red-500'
                          : storageUsage.usage_percent > 70
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                          }`}
                        style={{ width: `${Math.min(storageUsage.usage_percent, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>영상 {storageUsage.video_count}개</span>
                      <span>남은 용량: {storageUsage.remaining_gb.toFixed(2)} GB</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">카메라 스트림 설정</h2>
                <p className="text-sm text-gray-600 mb-4">
                  카메라에 재생할 영상을 업로드하세요. 업로드한 영상은 자동으로 순환 재생됩니다.
                </p>

                {/* 카메라 선택 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카메라 선택
                  </label>
                  {cameras.length === 0 ? (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      아직 카메라가 없습니다. 아래에서 영상을 업로드하면 자동으로 카메라가 생성됩니다.
                    </div>
                  ) : (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="input-field"
                    >
                      {cameras.map((camera) => (
                        <option key={camera.camera_id} value={camera.camera_id}>
                          {camera.camera_name || `카메라 ${camera.camera_id.replace('camera-', '')}`}
                        </option>
                      ))}
                    </select>
                  )}
                  {cameras.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      💡 팁: 기본 카메라(camera-1)가 자동으로 생성됩니다
                    </p>
                  )}
                </div>

                {/* 영상 업로드 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    영상 업로드
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      disabled={isUploadingVideo}
                      className="hidden"
                      id="video-upload"
                    />
                    <label
                      htmlFor="video-upload"
                      className={`btn-primary flex items-center gap-2 cursor-pointer ${isUploadingVideo ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                      <Upload className="w-4 h-4" />
                      {isUploadingVideo ? '업로드 중...' : '영상 선택'}
                    </label>
                    {isUploadingVideo && (
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    MP4, MOV, AVI 등 (최대 500MB)
                  </p>
                </div>

                {/* 업로드된 영상 목록 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    업로드된 영상 ({cameras.find((c) => c.camera_id === selectedCameraId)?.video_count || 0}개)
                  </h3>
                  {(() => {
                    const selectedCamera = cameras.find((c) => c.camera_id === selectedCameraId)

                    if (!selectedCamera || selectedCamera.videos.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">아직 업로드된 영상이 없습니다</p>
                          <p className="text-xs mt-1">위의 "영상 선택" 버튼을 클릭하여 영상을 업로드하세요</p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-3">
                        {selectedCamera.videos.map((video) => (
                          <div
                            key={video.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Video className="w-5 h-5 text-primary-600" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {video.filename}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {formatFileSize(video.file_size)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDuration(video.duration)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(video.uploaded_at).toLocaleDateString('ko-KR')}
                                  </span>
                                </div>
                              </div>
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <button
                              onClick={() => handleVideoDelete(video.id, video.filename)}
                              className="ml-3 p-2 text-danger hover:bg-danger-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="card bg-amber-50 border-amber-200">
                <h3 className="text-sm font-semibold text-amber-900 mb-2">⚠️ 중요 안내</h3>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li><strong>영상을 먼저 업로드해야 합니다</strong> - 업로드 없이는 스트림이 시작되지 않습니다</li>
                  <li>업로드한 영상들은 순서대로 자동 순환 재생됩니다</li>
                  <li>라이브 모니터링 페이지에서 실시간 스트림을 확인할 수 있습니다</li>
                  <li>영상 분석 및 하이라이트 클립 생성이 자동으로 진행됩니다</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'locale' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">언어 및 지역</h2>
              <p className="text-sm text-gray-600">언어 및 지역 설정 기능은 추후 추가될 예정입니다.</p>
            </div>
          )}

          {/* 🔥 구독 관리 탭 */}
          {activeSection === 'subscription' && (
            <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">구독 관리</h2>
                  {userInfo?.is_subscribed ? (
                    userInfo.has_billing_key ? (
                      // ✅ 자동결제 ON
                      <p className="text-sm text-gray-600">
                        베이직 플랜 · 월 9,900원 · 다음 결제일:{' '}
                        {formatNextBillingDate(userInfo.next_billing_at)}
                      </p>
                    ) : (
                      // ✅ 자동결제 OFF (이번 달까지만 사용)
                      <p className="text-sm text-gray-600">
                        베이직 플랜 · 월 9,900원 · 자동결제 해지됨 · 이용 가능 ~{' '}
                        {formatNextBillingDate(userInfo.next_billing_at)}
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-gray-600">
                      현재 구독 중인 플랜이 없습니다. 베이직 플랜을 구독하고 AI 분석 기능을 사용해
                      보세요.
                    </p>
                  )}
                </div>

                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${userInfo?.is_subscribed
                    ? userInfo.has_billing_key
                      ? 'bg-primary-600 text-white' // 활성
                      : 'bg-amber-500 text-white'   // 만료 예정
                    : 'bg-gray-300 text-gray-700'   // 미사용
                    }`}
                >
                  {userInfo?.is_subscribed
                    ? userInfo.has_billing_key
                      ? '활성'
                      : '만료 예정'
                    : '미사용'}
                </span>
              </div>

              {userInfo?.is_subscribed ? (
                <>
                  <div className="space-y-2 mb-4">
                    <FeatureItem text="1대의 카메라 실시간 AI 분석" />
                    <FeatureItem text="대시보드 · 발달 · 안전 리포트 전체 기능" />
                    <FeatureItem text="하이라이트 클립 자동 생성" />
                    <FeatureItem text="분석 데이터 30일 보관" />
                  </div>

                  <div className="flex gap-3">
                    <button className="btn-secondary flex-1" disabled>
                      플랜 변경 (준비중)
                    </button>

                    {userInfo.has_billing_key ? (
                      // 🔥 자동결제 ON → 해지 버튼
                      <button
                        className="btn-primary flex-1 bg-danger-500 hover:bg-danger-600 border-danger-500"
                        onClick={handleCancelSubscription}
                        disabled={isCancelling}
                      >
                        {isCancelling ? '해지 중...' : '구독 자동결제 해지'}
                      </button>
                    ) : (
                      // 🔥 자동결제 OFF → 다시 결제하러 가기
                      <Link
                        to="/subscription"
                        className="btn-primary flex-1 text-center flex items-center justify-center"
                      >
                        자동결제 다시 설정하기
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <Link
                    to="/subscription"
                    className="btn-primary flex-1 text-center flex items-center justify-center"
                  >
                    베이직 플랜 구독하러 가기
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div >
  )
}

// Settings Nav Item Component
function SettingsNavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: any
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
        }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  )
}



// Feature Item Component
function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  )
}
