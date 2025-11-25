import { Camera, SafetyIncident, DailyReport } from '../types'

// Mock 카메라 데이터
export const mockCameras: Camera[] = [
  {
    id: 'camera-1',
    name: '거실 카메라',
    location: '거실',
    status: 'online',
    rtspUrl: 'rtsp://example.com/stream1',
  },
  {
    id: 'camera-2',
    name: '아이방 카메라',
    location: '아이방',
    status: 'online',
    rtspUrl: 'rtsp://example.com/stream2',
  },
  {
    id: 'camera-3',
    name: '주방 카메라',
    location: '주방',
    status: 'offline',
  },
]

// Mock 안전 사고 데이터
export const mockIncidents: SafetyIncident[] = [
  {
    id: '1',
    timestamp: new Date('2024-11-11T14:15:00'),
    type: 'warning',
    title: '주방 근처 접근',
    description: '데드존에 3회 접근',
    location: '주방 입구',
    cameraId: 'camera-1',
    severity: 'high',
  },
  {
    id: '2',
    timestamp: new Date('2024-11-11T11:30:00'),
    type: 'warning',
    title: '계단 입구 접근',
    description: '약 2분간 체류',
    location: '계단',
    cameraId: 'camera-1',
    severity: 'medium',
  },
  {
    id: '3',
    timestamp: new Date('2024-11-11T13:20:00'),
    type: 'info',
    title: '가구 모서리 접촉',
    description: '거실 테이블 근처',
    location: '거실',
    cameraId: 'camera-1',
    severity: 'low',
  },
]

// Mock 일일 리포트
export const mockDailyReport: DailyReport = {
  date: new Date('2024-11-11'),
  aiSummary:
    '오늘 아이는 전반적으로 안전하게 활동했습니다. 거실 세이프존에서 92%의 시간을 보냈으며, 주방 데드존에 3회 접근했습니다.',
  safetyScore: 92,
  totalMonitoringTime: 525, // 분 단위 (8시간 45분)
  incidentCount: 3,
  safeZonePercentage: 92,
  activityLevel: 'high',
  risks: [
    {
      id: '1',
      level: 'high',
      title: '주방 근처 반복 접근',
      description: '오후 2:15 - 2:45 사이 3회 접근',
      location: '주방 입구 (데드존)',
      time: '14:15 - 14:45',
      count: 3,
    },
    {
      id: '2',
      level: 'medium',
      title: '계단 입구 접근',
      description: '1회 접근, 약 2분간 체류',
      location: '계단 입구',
      time: '11:30',
      count: 1,
    },
  ],
  recommendations: [
    {
      id: '1',
      priority: 'high',
      title: '주방 안전 게이트 설치',
      description: '아이가 주방 데드존에 자주 접근하고 있습니다.',
      estimatedCost: '3-5만원',
      difficulty: '쉬움',
    },
    {
      id: '2',
      priority: 'high',
      title: '거실 테이블 모서리 보호대 추가',
      description: '충돌 위험이 감지되었습니다.',
      estimatedCost: '1-2만원',
      difficulty: '매우 쉬움',
    },
  ],
}

// Mock 하이라이트 영상 데이터
export interface VideoHighlight {
  id: string
  title: string
  timestamp: string
  duration: string
  location: string
  severity: 'high' | 'medium' | 'low'
  thumbnailUrl?: string
  videoUrl?: string
  description: string
  aiAnalysis: string
}

export const mockVideoHighlights: VideoHighlight[] = [
  {
    id: 'highlight-1',
    title: '주방 데드존 접근',
    timestamp: '오후 2:23',
    duration: '0:32',
    location: '주방 입구',
    severity: 'high',
    description: '아이가 주방 가스레인지 근처에 접근했습니다.',
    aiAnalysis: '가스레인지 근처에서 약 15초간 머물렀습니다. 즉시 안전 게이트 설치를 권장합니다.',
  },
  {
    id: 'highlight-2',
    title: '계단 입구 접근',
    timestamp: '오전 11:30',
    duration: '1:45',
    location: '계단',
    severity: 'high',
    description: '계단 안전 게이트 근처에서 약 2분간 활동했습니다.',
    aiAnalysis: '게이트를 흔드는 행동이 관찰되었습니다. 게이트 잠금 장치 점검이 필요합니다.',
  },
  {
    id: 'highlight-3',
    title: '거실 테이블 모서리 근접',
    timestamp: '오후 1:20',
    duration: '0:18',
    location: '거실',
    severity: 'medium',
    description: '거실 테이블 모서리 근처에서 빠르게 이동했습니다.',
    aiAnalysis: '충돌 위험이 감지되었습니다. 모서리 보호대 추가를 권장합니다.',
  },
  {
    id: 'highlight-4',
    title: '소파에서 점프',
    timestamp: '오후 3:45',
    duration: '0:25',
    location: '거실',
    severity: 'medium',
    description: '소파에서 뛰어내리는 행동이 관찰되었습니다.',
    aiAnalysis: '낙상 위험이 있습니다. 소파 주변에 매트 설치를 고려하세요.',
  },
  {
    id: 'highlight-5',
    title: '창문 근처 접근',
    timestamp: '오후 4:15',
    duration: '0:42',
    location: '거실',
    severity: 'low',
    description: '창문 근처에서 활동했습니다.',
    aiAnalysis: '창문 잠금 상태를 확인하고, 창문 안전 장치 설치를 권장합니다.',
  },
]

// 차트 데이터 생성 헬퍼
export function generateWeeklySafetyData() {
  return [
    { day: '월', score: 85, incidents: 5 },
    { day: '화', score: 88, incidents: 3 },
    { day: '수', score: 92, incidents: 2 },
    { day: '목', score: 87, incidents: 4 },
    { day: '금', score: 90, incidents: 3 },
    { day: '토', score: 95, incidents: 1 },
    { day: '일', score: 93, incidents: 2 },
  ]
}

export function generateHourlyActivityData() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    activity: Math.floor(Math.random() * 100),
    safety: Math.floor(Math.random() * 30) + 70,
  }))
}

// Mock Dashboard Data
import type { DashboardData } from '../lib/api'

export const mockDashboardData: DashboardData = {
  summary: '오늘 아이는 전반적으로 안전하게 활동했습니다. 거실 세이프존에서 92%의 시간을 보냈으며, 주방 데드존에 3회 접근했습니다. 전반적으로 안전한 환경에서 활동하고 있어 보입니다.',
  rangeDays: 7,
  safetyScore: 92,
  incidentCount: 3,
  monitoringHours: 48,
  activityPattern: '활발',
  weeklyTrend: [
    { day: '월', score: 85, incidents: 5 },
    { day: '화', score: 88, incidents: 3 },
    { day: '수', score: 92, incidents: 2 },
    { day: '목', score: 87, incidents: 4 },
    { day: '금', score: 90, incidents: 3 },
    { day: '토', score: 95, incidents: 1 },
    { day: '일', score: 93, incidents: 2 },
  ],
  risks: [
    {
      level: 'high',
      title: '주방 근처 반복 접근',
      time: '14:15 - 14:45',
      count: 3,
    },
    {
      level: 'medium',
      title: '계단 입구 접근',
      time: '11:30',
      count: 1,
    },
    {
      level: 'low',
      title: '가구 모서리 접촉',
      time: '13:20',
      count: 1,
    },
  ],
  recommendations: [
    {
      priority: 'high',
      title: '주방 안전 게이트 설치',
      description: '아이가 주방 데드존에 자주 접근하고 있습니다. 안전 게이트 설치를 권장합니다.',
    },
    {
      priority: 'high',
      title: '거실 테이블 모서리 보호대 추가',
      description: '충돌 위험이 감지되었습니다. 모서리 보호대를 추가해주세요.',
    },
    {
      priority: 'medium',
      title: '계단 게이트 점검',
      description: '계단 게이트 잠금 장치를 정기적으로 점검해주세요.',
    },
  ],
}

// Mock Analytics Data
import type { AnalyticsData } from '../lib/api'

export const mockAnalyticsData: AnalyticsData = {
  weekly_trend: [
    { date: '2024-11-04', safety: 85, incidents: 5, activity: 75 },
    { date: '2024-11-05', safety: 88, incidents: 3, activity: 82 },
    { date: '2024-11-06', safety: 92, incidents: 2, activity: 88 },
    { date: '2024-11-07', safety: 87, incidents: 4, activity: 79 },
    { date: '2024-11-08', safety: 90, incidents: 3, activity: 85 },
    { date: '2024-11-09', safety: 95, incidents: 1, activity: 92 },
    { date: '2024-11-10', safety: 93, incidents: 2, activity: 90 },
  ],
  incident_distribution: [
    { name: '데드존 접근', value: 12, color: '#ef4444' },
    { name: '모서리 충돌', value: 8, color: '#f59e0b' },
    { name: '낙상 위험', value: 3, color: '#fb923c' },
    { name: '기타', value: 2, color: '#9ca3af' },
  ],
  summary: {
    avg_safety_score: 90,
    total_incidents: 25,
    safe_zone_percentage: 89.5,
    incident_reduction_percentage: 15.2,
    prev_avg_safety: 78,
    prev_total_incidents: 30,
    safety_change: 12,
    safety_change_percent: 15.4,
    incident_change: -5,
    incident_change_percent: -16.7,
  },
}