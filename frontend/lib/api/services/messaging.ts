import { api, type PaginatedResponse } from "../client";
import type { Notification } from "@/lib/types";

export interface NotificationFilters {
  is_read?: string;
  page?: string;
  page_size?: string;
}

export const notificationsService = {
  async list(filters?: NotificationFilters): Promise<PaginatedResponse<Notification>> {
    const params = filters ? ({ ...filters } as Record<string, string>) : undefined;
    const { data } = await api.get<PaginatedResponse<Notification>>("/notifications/", params);
    return data;
  },

  async listAll(filters?: NotificationFilters): Promise<Notification[]> {
    const results: Notification[] = [];
    let page = Number(filters?.page || 1);

    while (true) {
      const { data } = await api.get<PaginatedResponse<Notification>>("/notifications/", {
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
    const { data } = await api.post<Notification>(`/notifications/${id}/mark_read/`, {});
    return data;
  },

  async markAllRead(): Promise<void> {
    await api.post("/notifications/mark_all_read/", {});
  },
};
