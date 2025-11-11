import { useState } from 'react'
import {
  Camera,
  Plus,
  Wifi,
  MapPin,
  Shield,
  Skull,
  Settings,
  Trash2,
  CheckCircle2,
} from 'lucide-react'

export default function CameraSetup() {
  const [selectedCamera, setSelectedCamera] = useState<string | null>('camera-1')
  const [zoneMode, setZoneMode] = useState<'safe' | 'dead'>('safe')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">홈캠 연동</h1>
          <p className="text-gray-600 mt-1">카메라를 연결하고 안전 구역을 설정하세요</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          새 카메라 추가
        </button>
      </div>

      {/* Camera List & Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera List */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">연동된 카메라</h2>
          <div className="space-y-3">
            <CameraCard
              id="camera-1"
              name="거실 카메라"
              status="online"
              location="거실"
              isSelected={selectedCamera === 'camera-1'}
              onSelect={() => setSelectedCamera('camera-1')}
            />
            <CameraCard
              id="camera-2"
              name="아이방 카메라"
              status="online"
              location="아이방"
              isSelected={selectedCamera === 'camera-2'}
              onSelect={() => setSelectedCamera('camera-2')}
            />
            <CameraCard
              id="camera-3"
              name="주방 카메라"
              status="offline"
              location="주방"
              isSelected={selectedCamera === 'camera-3'}
              onSelect={() => setSelectedCamera('camera-3')}
            />
          </div>

          {/* Add Camera Button */}
          <button className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            카메라 추가
          </button>
        </div>

        {/* Zone Setup */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">구역 설정</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setZoneMode('safe')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  zoneMode === 'safe'
                    ? 'bg-safe text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                세이프존
              </button>
              <button
                onClick={() => setZoneMode('dead')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  zoneMode === 'dead'
                    ? 'bg-danger text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Skull className="w-4 h-4 inline mr-2" />
                데드존
              </button>
            </div>
          </div>

          {/* Camera Preview with Zone Drawing */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-4">
            {/* Simulated Camera Feed */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="text-sm">카메라 피드 (시뮬레이션)</p>
                <p className="text-xs mt-1">실제 구현 시 WebRTC 또는 HLS 스트림</p>
              </div>
            </div>

            {/* Safe Zone Overlay (Example) */}
            <div className="absolute top-20 left-20 w-64 h-48 border-4 border-safe rounded-lg bg-safe/10">
              <div className="absolute -top-8 left-0 bg-safe text-white text-xs px-2 py-1 rounded">
                세이프존 1
              </div>
            </div>

            {/* Dead Zone Overlay (Example) */}
            <div className="absolute bottom-20 right-20 w-48 h-32 border-4 border-danger rounded-lg bg-danger/10">
              <div className="absolute -top-8 left-0 bg-danger text-white text-xs px-2 py-1 rounded">
                데드존 1 (주방)
              </div>
            </div>

            {/* Drawing Instructions */}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
              💡 화면을 드래그하여 {zoneMode === 'safe' ? '세이프존' : '데드존'}을 그리세요
            </div>
          </div>

          {/* Zone List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">설정된 구역</h3>
            <ZoneItem
              type="safe"
              name="세이프존 1"
              description="거실 중앙 영역"
            />
            <ZoneItem
              type="safe"
              name="세이프존 2"
              description="놀이 공간"
            />
            <ZoneItem
              type="dead"
              name="데드존 1"
              description="주방 입구"
            />
          </div>
        </div>
      </div>

      {/* Camera Connection Guide */}
      <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">카메라 연동 가이드</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GuideStep
            step={1}
            title="카메라 연결"
            description="기존 홈캠의 RTSP 주소를 입력하거나 Wi-Fi로 연결하세요"
            icon={Wifi}
          />
          <GuideStep
            step={2}
            title="위치 설정"
            description="카메라가 설치된 공간을 지정하세요"
            icon={MapPin}
          />
          <GuideStep
            step={3}
            title="구역 설정"
            description="세이프존과 데드존을 그려서 안전 범위를 정의하세요"
            icon={Shield}
          />
        </div>
      </div>
    </div>
  )
}

// Camera Card Component
function CameraCard({
  id,
  name,
  status,
  location,
  isSelected,
  onSelect,
}: {
  id: string
  name: string
  status: 'online' | 'offline'
  location: string
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Camera className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-500">{location}</p>
          </div>
        </div>
        {status === 'online' && (
          <CheckCircle2 className="w-5 h-5 text-safe" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-safe' : 'bg-gray-400'}`}></div>
          <span className="text-xs text-gray-600">
            {status === 'online' ? '온라인' : '오프라인'}
          </span>
        </div>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-gray-200 rounded">
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-1 hover:bg-danger-50 rounded">
            <Trash2 className="w-4 h-4 text-gray-600 hover:text-danger" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Zone Item Component
function ZoneItem({
  type,
  name,
  description,
}: {
  type: 'safe' | 'dead'
  name: string
  description: string
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {type === 'safe' ? (
          <Shield className="w-5 h-5 text-safe" />
        ) : (
          <Skull className="w-5 h-5 text-danger" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button className="p-1 hover:bg-gray-200 rounded">
        <Trash2 className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  )
}

// Guide Step Component
function GuideStep({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: number
  title: string
  description: string
  icon: any
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
          {step}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

