import api from './axios';
import type { AppNotification } from '../types';

export async function fetchNotifications(limit = 80): Promise<{
  unreadCount: number;
  notifications: AppNotification[];
}> {
  const { data } = await api.get<{
    unreadCount: number;
    notifications: AppNotification[];
  }>('/api/notifications', { params: { limit } });
  return data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/api/notifications/read-all');
}
