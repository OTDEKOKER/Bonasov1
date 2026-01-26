/**
 * Organizations Service
 * 
 * CRUD operations for organizations.
 * Django endpoint base: /api/organizations/
 */

import { api, type PaginatedResponse } from '../client';
import type { Organization } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface OrganizationFilters {
  search?: string;
  parent?: string;
  is_active?: string;
  page?: string;
  page_size?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  code: string;
  parent?: number | null;
  description?: string;
}

export interface UpdateOrganizationRequest extends Partial<CreateOrganizationRequest> {
  is_active?: boolean;
}

// ============================================================================
// Organizations Service
// ============================================================================

export const organizationsService = {
  /**
   * List all organizations with optional filters
   * Django endpoint: GET /api/organizations/
   */
  async list(filters?: OrganizationFilters): Promise<PaginatedResponse<Organization>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Organization>>('/organizations/', params);
    return data;
  },

  /**
   * Get a single organization by ID
   * Django endpoint: GET /api/organizations/:id/
   */
  async get(id: number): Promise<Organization> {
    const { data } = await api.get<Organization>(`/organizations/${id}/`);
    return data;
  },

  /**
   * Create a new organization
   * Django endpoint: POST /api/organizations/
   */
  async create(request: CreateOrganizationRequest): Promise<Organization> {
    const { data } = await api.post<Organization>('/organizations/', request);
    return data;
  },

  /**
   * Update an organization
   * Django endpoint: PATCH /api/organizations/:id/
   */
  async update(id: number, request: UpdateOrganizationRequest): Promise<Organization> {
    const { data } = await api.patch<Organization>(`/organizations/${id}/`, request);
    return data;
  },

  /**
   * Delete an organization
   * Django endpoint: DELETE /api/organizations/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/organizations/${id}/`);
  },

  /**
   * Get organization hierarchy tree
   * Django endpoint: GET /api/organizations/tree/
   */
  async getTree(): Promise<Organization[]> {
    const { data } = await api.get<Organization[]>('/organizations/tree/');
    return data;
  },

  /**
   * Get organizations for dropdown select
   * Django endpoint: GET /api/organizations/choices/
   */
  async getChoices(): Promise<Array<{ id: number; name: string }>> {
    const { data } = await api.get<Array<{ id: number; name: string }>>('/organizations/choices/');
    return data;
  },
};

export default organizationsService;
