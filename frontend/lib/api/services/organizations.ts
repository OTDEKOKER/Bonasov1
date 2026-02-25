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
  code?: string;
  type?: string;
  parent?: number | null;
  parentId?: number | string | null;
  description?: string;
  address?: string;
  email?: string;
  phone?: string;
  contactEmail?: string;
  contactPhone?: string;
  is_active?: boolean;
}

export interface UpdateOrganizationRequest extends Partial<CreateOrganizationRequest> {
  is_active?: boolean;
}

function makeCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || 'ORG';
}

function mapOrganization(org: any): Organization {
  return {
    id: String(org.id),
    name: org.name,
    type: org.type,
    parentId: org.parent ? String(org.parent) : undefined,
    contactEmail: org.email ?? undefined,
    contactPhone: org.phone ?? undefined,
    address: org.address ?? undefined,
    description: org.description ?? undefined,
    is_active: org.is_active ?? undefined,
    createdAt: org.created_at ?? org.createdAt ?? '',
    // Preserve code if present for internal use.
    code: org.code,
  } as Organization & { code?: string };
}

function mapPaginatedOrganizations(
  data: PaginatedResponse<any>,
): PaginatedResponse<Organization> {
  return {
    ...data,
    results: data.results.map(mapOrganization),
  };
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
    return mapPaginatedOrganizations(data as PaginatedResponse<any>);
  },
  /**
   * List all organizations across all pages
   */
  async listAll(filters?: OrganizationFilters): Promise<Organization[]> {
    const results: Organization[] = [];
    let page = filters?.page ? String(filters.page) : "1";
    const baseFilters = { ...(filters || {}) } as Record<string, string>;
    delete (baseFilters as any).page;

    while (true) {
      const { data } = await api.get<PaginatedResponse<Organization>>('/organizations/', {
        ...baseFilters,
        page,
      });
      const mapped = mapPaginatedOrganizations(data as PaginatedResponse<any>);
      results.push(...mapped.results);
      if (!mapped.next) break;
      try {
        const nextUrl = new URL(mapped.next);
        const nextPage = nextUrl.searchParams.get("page");
        if (!nextPage) break;
        page = nextPage;
      } catch {
        break;
      }
    }
    return results;
  },

  /**
   * Get a single organization by ID
   * Django endpoint: GET /api/organizations/:id/
   */
  async get(id: number): Promise<Organization> {
    const { data } = await api.get<Organization>(`/organizations/${id}/`);
    return mapOrganization(data);
  },

  /**
   * Create a new organization
   * Django endpoint: POST /api/organizations/
   */
  async create(request: CreateOrganizationRequest): Promise<Organization> {
    const payload = {
      name: request.name,
      code: request.code || makeCode(request.name),
      type: request.type,
      parent: request.parent ?? (request.parentId ? Number(request.parentId) : undefined),
      description: request.description,
      address: request.address,
      email: request.email ?? request.contactEmail,
      phone: request.phone ?? request.contactPhone,
      is_active: request.is_active,
    };
    const { data } = await api.post<Organization>('/organizations/', payload);
    return mapOrganization(data);
  },

  /**
   * Update an organization
   * Django endpoint: PATCH /api/organizations/:id/
   */
  async update(id: number, request: UpdateOrganizationRequest): Promise<Organization> {
    const payload = {
      ...request,
      parent: request.parent ?? (request.parentId ? Number(request.parentId) : undefined),
      email: request.email ?? request.contactEmail,
      phone: request.phone ?? request.contactPhone,
    };
    delete (payload as any).parentId;
    delete (payload as any).contactEmail;
    delete (payload as any).contactPhone;
    const { data } = await api.patch<Organization>(`/organizations/${id}/`, payload);
    return mapOrganization(data);
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
