// Camera Types
export interface Camera {
  id: string
  name: string
  location: string
  status: 'online' | 'offline'
  rtspUrl?: string
  lastUpdate?: Date
}

// Zone Types
export interface Zone {
  id: string
  cameraId: string
  type: 'safe' | 'dead'
  name: string
  coordinates: Coordinate[]
  description?: string
}

export interface Coordinate {
  x: number
  y: number
}

// Safety Types
export interface SafetyIncident {
  id: string
  timestamp: Date
  type: 'danger' | 'warning' | 'info'
  title: string
  description: string
  location: string
  cameraId: string
  severity: 'high' | 'medium' | 'low'
}

// Report Types
export interface DailyReport {
  date: Date
  aiSummary: string
  safetyScore: number
  totalMonitoringTime: number
  incidentCount: number
  safeZonePercentage: number
  activityLevel: 'low' | 'medium' | 'high'
  risks: RiskItem[]
  recommendations: Recommendation[]
}

export interface RiskItem {
  id: string
  level: 'high' | 'medium' | 'low'
  title: string
  description: string
  location: string
  time: string
  count: number
}

export interface Recommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimatedCost: string
  difficulty: string
}

// Analytics Types
export interface ActivityData {
  timestamp: Date
  location: string
  activityLevel: number
  safetyScore: number
}

export interface HeatmapData {
  x: number
  y: number
  intensity: number
}

// User Types
export interface User {
  id: string
  name: string
  email: string
  phone: string
  childInfo: ChildInfo
  subscription: Subscription
}

export interface ChildInfo {
  name: string
  ageInMonths: number
  birthDate?: Date
}

export interface Subscription {
  plan: 'free' | 'premium' | 'enterprise'
  status: 'active' | 'inactive' | 'expired'
  startDate: Date
  endDate: Date
  price: number
}

// Notification Types
export interface Notification {
  id: string
  type: 'danger' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
  cameraId?: string
}

