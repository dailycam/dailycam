/**
 * 알림 관리 유틸리티
 * localStorage를 사용하여 알림을 영구 저장
 */

export interface StoredNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string; // ISO 8601 형식
  type: 'checklist_completed' | 'system' | 'analysis' | 'highlight';
  data?: any;
  read: boolean;
}

const NOTIFICATIONS_KEY = 'dailycam_notifications';
const MAX_NOTIFICATIONS = 100; // 최대 저장 개수

/**
 * 모든 알림 가져오기
 */
export function getNotifications(): StoredNotification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('알림 로드 오류:', error);
    return [];
  }
}

/**
 * 새 알림 추가
 */
export function addNotification(notification: Omit<StoredNotification, 'id' | 'timestamp' | 'read'>): StoredNotification {
  const newNotification: StoredNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const notifications = getNotifications();
  const updated = [newNotification, ...notifications].slice(0, MAX_NOTIFICATIONS);
  
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('알림 저장 오류:', error);
  }

  return newNotification;
}

/**
 * 알림 삭제
 */
export function deleteNotification(id: string): void {
  const notifications = getNotifications();
  const updated = notifications.filter(n => n.id !== id);
  
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('알림 삭제 오류:', error);
  }
}

/**
 * 모든 알림 삭제
 */
export function clearAllNotifications(): void {
  try {
    localStorage.removeItem(NOTIFICATIONS_KEY);
  } catch (error) {
    console.error('알림 전체 삭제 오류:', error);
  }
}

/**
 * 알림 읽음 처리
 */
export function markAsRead(id: string): void {
  const notifications = getNotifications();
  const updated = notifications.map(n => 
    n.id === id ? { ...n, read: true } : n
  );
  
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
  }
}

/**
 * 모든 알림 읽음 처리
 */
export function markAllAsRead(): void {
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('알림 전체 읽음 처리 오류:', error);
  }
}

/**
 * 읽지 않은 알림 개수
 */
export function getUnreadCount(): number {
  const notifications = getNotifications();
  return notifications.filter(n => !n.read).length;
}

/**
 * 상대 시간 포맷 (방금 전, 5분 전, 1시간 전 등)
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  
  // 7일 이상이면 날짜 표시
  return then.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 절대 시간 포맷 (2025년 12월 9일 오후 4:30)
 */
export function formatAbsoluteTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

