/**
 * Social Media Posts Service
 *
 * CRUD operations for social posts.
 * Django endpoint base: /api/social/
 */

import { api, type PaginatedResponse } from "../client";
import type { SocialPost } from "@/lib/types";

// ============================================================================
// Types
// ============================================================================

export interface SocialPostFilters {
  search?: string;
  indicator?: string;
  organization?: string;
  platform?: string;
  page?: string;
  page_size?: string;
}

export interface CreateSocialPostRequest {
  title: string;
  description?: string;
  post_date?: string;
  indicator: number;
  organization?: number;
  platform?: "facebook" | "instagram" | "twitter" | "tiktok" | "youtube" | "other";
  url: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface UpdateSocialPostRequest extends Partial<CreateSocialPostRequest> {}

// ============================================================================
// Social Posts
// ============================================================================

export const socialPostsService = {
  async list(filters?: SocialPostFilters): Promise<PaginatedResponse<SocialPost>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<SocialPost>>(
      "/social/posts/",
      params,
    );
    return data;
  },

  async get(id: number): Promise<SocialPost> {
    const { data } = await api.get<SocialPost>(`/social/posts/${id}/`);
    return data;
  },

  async create(request: CreateSocialPostRequest): Promise<SocialPost> {
    const { data } = await api.post<SocialPost>("/social/posts/", request);
    return data;
  },

  async update(id: number, request: UpdateSocialPostRequest): Promise<SocialPost> {
    const { data } = await api.patch<SocialPost>(`/social/posts/${id}/`, request);
    return data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/social/posts/${id}/`);
  },
};


