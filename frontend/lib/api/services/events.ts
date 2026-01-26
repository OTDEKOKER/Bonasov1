/**
 * Events & Social Media Service
 * 
 * CRUD operations for events and social media posts.
 * Django endpoint base: /api/activities/ and /api/social/
 */

import { api, type PaginatedResponse } from '../client';
import type { Event, SocialPost } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface EventFilters {
  search?: string;
  type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  organization?: string;
  project?: string;
  page?: string;
  page_size?: string;
}

export interface CreateEventRequest {
  name: string;
  type: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  organization_id: number;
  project_id?: number;
  expected_participants?: number;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  actual_participants?: number;
}

export interface EventParticipant {
  id: number;
  event_id: number;
  respondent_id?: number;
  name?: string;
  gender?: string;
  attendance_confirmed: boolean;
  attended: boolean;
}

export interface AddParticipantRequest {
  respondent_id?: number;
  name?: string;
  gender?: string;
}

export interface SocialPostFilters {
  search?: string;
  platform?: string;
  date_from?: string;
  date_to?: string;
  organization?: string;
  page?: string;
  page_size?: string;
}

export interface CreateSocialPostRequest {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'other';
  post_url: string;
  content?: string;
  post_date: string;
  organization_id: number;
  project_id?: number;
}

export interface UpdateSocialPostRequest extends Partial<CreateSocialPostRequest> {
  likes?: number;
  shares?: number;
  comments?: number;
  reach?: number;
  impressions?: number;
}

// ============================================================================
// Events Service
// ============================================================================

export const eventsService = {
  /**
   * List all events with optional filters
   * Django endpoint: GET /api/activities/
   */
  async list(filters?: EventFilters): Promise<PaginatedResponse<Event>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Event>>('/activities/', params);
    return data;
  },

  /**
   * Get a single event by ID
   * Django endpoint: GET /api/activities/:id/
   */
  async get(id: number): Promise<Event> {
    const { data } = await api.get<Event>(`/activities/${id}/`);
    return data;
  },

  /**
   * Create a new event
   * Django endpoint: POST /api/activities/
   */
  async create(request: CreateEventRequest): Promise<Event> {
    const { data } = await api.post<Event>('/activities/', request);
    return data;
  },

  /**
   * Update an event
   * Django endpoint: PATCH /api/activities/:id/
   */
  async update(id: number, request: UpdateEventRequest): Promise<Event> {
    const { data } = await api.patch<Event>(`/activities/${id}/`, request);
    return data;
  },

  /**
   * Delete an event
   * Django endpoint: DELETE /api/activities/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/activities/${id}/`);
  },

  /**
   * Get event participants
   * Django endpoint: GET /api/activities/:id/participants/
   */
  async getParticipants(id: number): Promise<EventParticipant[]> {
    const { data } = await api.get<EventParticipant[]>(`/activities/${id}/participants/`);
    return data;
  },

  /**
   * Add participant to event
   * Django endpoint: POST /api/activities/:id/participants/
   */
  async addParticipant(id: number, request: AddParticipantRequest): Promise<EventParticipant> {
    const { data } = await api.post<EventParticipant>(`/activities/${id}/participants/`, request);
    return data;
  },

  /**
   * Remove participant from event
   * Django endpoint: DELETE /api/activities/:id/participants/:participantId/
   */
  async removeParticipant(eventId: number, participantId: number): Promise<void> {
    await api.delete(`/activities/${eventId}/participants/${participantId}/`);
  },

  /**
   * Mark attendance for participant
   * Django endpoint: POST /api/activities/:id/participants/:participantId/attendance/
   */
  async markAttendance(eventId: number, participantId: number, attended: boolean): Promise<void> {
    await api.post(`/activities/${eventId}/participants/${participantId}/attendance/`, { attended });
  },

  /**
   * Get event types for filtering
   * Django endpoint: GET /api/activities/types/
   */
  async getTypes(): Promise<string[]> {
    const { data } = await api.get<string[]>('/activities/types/');
    return data;
  },

  /**
   * Get event statistics
   * Django endpoint: GET /api/activities/stats/
   */
  async getStats(): Promise<{
    total: number;
    completed: number;
    total_participants: number;
    by_type: Record<string, number>;
  }> {
    const { data } = await api.get('/activities/stats/');
    return data;
  },

  /**
   * Get upcoming events
   * Django endpoint: GET /api/activities/upcoming/
   */
  async getUpcoming(days: number = 30): Promise<Event[]> {
    const { data } = await api.get<Event[]>('/activities/upcoming/', { days: days.toString() });
    return data;
  },
};

// ============================================================================
// Social Posts Service
// ============================================================================

export const socialPostsService = {
  /**
   * List all social posts with optional filters
   * Django endpoint: GET /api/social/
   */
  async list(filters?: SocialPostFilters): Promise<PaginatedResponse<SocialPost>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<SocialPost>>('/social/', params);
    return data;
  },

  /**
   * Get a single social post by ID
   * Django endpoint: GET /api/social/:id/
   */
  async get(id: number): Promise<SocialPost> {
    const { data } = await api.get<SocialPost>(`/social/${id}/`);
    return data;
  },

  /**
   * Create a new social post
   * Django endpoint: POST /api/social/
   */
  async create(request: CreateSocialPostRequest): Promise<SocialPost> {
    const { data } = await api.post<SocialPost>('/social/', request);
    return data;
  },

  /**
   * Update a social post (typically for updating metrics)
   * Django endpoint: PATCH /api/social/:id/
   */
  async update(id: number, request: UpdateSocialPostRequest): Promise<SocialPost> {
    const { data } = await api.patch<SocialPost>(`/social/${id}/`, request);
    return data;
  },

  /**
   * Delete a social post
   * Django endpoint: DELETE /api/social/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/social/${id}/`);
  },

  /**
   * Get social media statistics
   * Django endpoint: GET /api/social/stats/
   */
  async getStats(): Promise<{
    total_posts: number;
    total_likes: number;
    total_shares: number;
    total_reach: number;
    by_platform: Record<string, {
      posts: number;
      likes: number;
      shares: number;
      reach: number;
    }>;
  }> {
    const { data } = await api.get('/social/stats/');
    return data;
  },

  /**
   * Refresh metrics for a post (if integrated with social APIs)
   * Django endpoint: POST /api/social/:id/refresh-metrics/
   */
  async refreshMetrics(id: number): Promise<SocialPost> {
    const { data } = await api.post<SocialPost>(`/social/${id}/refresh-metrics/`);
    return data;
  },
};

export default eventsService;
