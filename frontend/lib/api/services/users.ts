/**
 * Users Service
 * 
 * CRUD operations for user management.
 * Django endpoint base: /api/users/
 */

import { api, type PaginatedResponse } from '../client';
import type { User, UserRole } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface UserFilters {
  search?: string;
  role?: UserRole;
  organization?: string;
  is_active?: string;
  page?: string;
  page_size?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: UserRole;
  organization_id: number;
}

export interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  organization_id?: number;
  is_active?: boolean;
}

export interface UserActivity {
  id: number;
  user_id: number;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

// ============================================================================
// Users Service
// ============================================================================

export const usersService = {
  /**
   * List all users with optional filters
   * Django endpoint: GET /api/users/
   */
  async list(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<User>>('/users/', params);
    return data;
  },

  /**
   * Get a single user by ID
   * Django endpoint: GET /api/users/:id/
   */
  async get(id: number): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}/`);
    return data;
  },

  /**
   * Create a new user
   * Django endpoint: POST /api/users/
   */
  async create(request: CreateUserRequest): Promise<User> {
    const { data } = await api.post<User>('/users/', request);
    return data;
  },

  /**
   * Update a user
   * Django endpoint: PATCH /api/users/:id/
   */
  async update(id: number, request: UpdateUserRequest): Promise<User> {
    const { data } = await api.patch<User>(`/users/${id}/`, request);
    return data;
  },

  /**
   * Delete a user
   * Django endpoint: DELETE /api/users/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}/`);
  },

  /**
   * Activate a user
   * Django endpoint: POST /api/users/:id/activate/
   */
  async activate(id: number): Promise<User> {
    const { data } = await api.post<User>(`/users/${id}/activate/`);
    return data;
  },

  /**
   * Deactivate a user
   * Django endpoint: POST /api/users/:id/deactivate/
   */
  async deactivate(id: number): Promise<User> {
    const { data } = await api.post<User>(`/users/${id}/deactivate/`);
    return data;
  },

  /**
   * Get user activity log
   * Django endpoint: GET /api/users/:id/activity/
   */
  async getActivity(id: number): Promise<UserActivity[]> {
    const { data } = await api.get<UserActivity[]>(`/users/${id}/activity/`);
    return data;
  },

  /**
   * Resend invitation email
   * Django endpoint: POST /api/users/:id/resend-invitation/
   */
  async resendInvitation(id: number): Promise<void> {
    await api.post(`/users/${id}/resend-invitation/`);
  },
};

export default usersService;
