import { api, type PaginatedResponse } from "../client";
import type { Notification } from "@/lib/types";

export interface NotificationFilters {
  is_read?: string;
  page?: string;
  page_size?: string;
}

const NOTIFICATIONS_BASE = "/messages/notifications";

interface NotificationUnreadCountResponse {
  count: number;
}

export const notificationsService = {
  async list(filters?: NotificationFilters): Promise<PaginatedResponse<Notification>> {
    const params = filters ? ({ ...filters } as Record<string, string>) : undefined;
    const { data } = await api.get<PaginatedResponse<Notification>>(`${NOTIFICATIONS_BASE}/`, params);
    return data;
  },

  async listAll(filters?: NotificationFilters): Promise<Notification[]> {
    const results: Notification[] = [];
    let page = Number(filters?.page || 1);

    while (true) {
      const { data } = await api.get<PaginatedResponse<Notification>>(`${NOTIFICATIONS_BASE}/`, {
        ...filters,
        page: String(page),
      });
      results.push(...(data.results || []));
      if (!data.next) break;
      page += 1;
    }

    return results;
  },

  async markRead(id: number): Promise<Notification> {
    const { data } = await api.post<Notification>(`${NOTIFICATIONS_BASE}/${id}/mark_read/`, {});
    return data;
  },

  async markAllRead(): Promise<void> {
    await api.post(`${NOTIFICATIONS_BASE}/mark_all_read/`, {});
  },

  async unreadCount(): Promise<number> {
    try {
      const { data } = await api.get<NotificationUnreadCountResponse>(`${NOTIFICATIONS_BASE}/unread_count/`);
      return Number(data?.count || 0);
    } catch {
      const { data } = await api.get<PaginatedResponse<Notification>>(`${NOTIFICATIONS_BASE}/`, {
        is_read: "false",
        page: "1",
        page_size: "1",
      });
      return Number(data?.count || 0);
    }
  },
};
