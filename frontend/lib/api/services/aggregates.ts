/**
 * Aggregates Service
 * 
 * CRUD operations for aggregate data (tabular data without respondent linking).
 * Django endpoint base: /api/aggregates/
 */

import { api, type PaginatedResponse } from '../client';
import type { Aggregate } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface AggregateFilters {
  search?: string;
  indicator?: string;
  project?: string;
  period?: string;
  date_from?: string;
  date_to?: string;
  organization?: string;
  page?: string;
  page_size?: string;
}

export interface CreateAggregateRequest {
  indicator_id: number;
  project_id: number;
  organization_id: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  value: number;
  disaggregation?: Record<string, number>; // e.g., { "male": 50, "female": 60 }
  notes?: string;
}

export interface UpdateAggregateRequest extends Partial<CreateAggregateRequest> {}

export interface BulkAggregateRequest {
  project_id: number;
  organization_id: number;
  period: string;
  period_start: string;
  period_end: string;
  data: Array<{
    indicator_id: number;
    value: number;
    disaggregation?: Record<string, number>;
  }>;
}

export interface AggregateTemplate {
  id: number;
  name: string;
  indicators: Array<{
    id: number;
    name: string;
    code: string;
    type: string;
    disaggregation_fields?: string[];
  }>;
}

// ============================================================================
// Aggregates Service
// ============================================================================

export const aggregatesService = {
  /**
   * List all aggregates with optional filters
   * Django endpoint: GET /api/aggregates/
   */
  async list(filters?: AggregateFilters): Promise<PaginatedResponse<Aggregate>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Aggregate>>('/aggregates/', params);
    return data;
  },

  /**
   * Get a single aggregate by ID
   * Django endpoint: GET /api/aggregates/:id/
   */
  async get(id: number): Promise<Aggregate> {
    const { data } = await api.get<Aggregate>(`/aggregates/${id}/`);
    return data;
  },

  /**
   * Create a new aggregate
   * Django endpoint: POST /api/aggregates/
   */
  async create(request: CreateAggregateRequest): Promise<Aggregate> {
    const { data } = await api.post<Aggregate>('/aggregates/', request);
    return data;
  },

  /**
   * Update an aggregate
   * Django endpoint: PATCH /api/aggregates/:id/
   */
  async update(id: number, request: UpdateAggregateRequest): Promise<Aggregate> {
    const { data } = await api.patch<Aggregate>(`/aggregates/${id}/`, request);
    return data;
  },

  /**
   * Delete an aggregate
   * Django endpoint: DELETE /api/aggregates/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/aggregates/${id}/`);
  },

  /**
   * Bulk create aggregates
   * Django endpoint: POST /api/aggregates/bulk/
   */
  async bulkCreate(request: BulkAggregateRequest): Promise<Aggregate[]> {
    const { data } = await api.post<Aggregate[]>('/aggregates/bulk/', request);
    return data;
  },

  /**
   * Get aggregate templates (predefined indicator sets)
   * Django endpoint: GET /api/aggregates/templates/
   */
  async getTemplates(): Promise<AggregateTemplate[]> {
    const { data } = await api.get<AggregateTemplate[]>('/aggregates/templates/');
    return data;
  },

  /**
   * Get aggregate summary by indicator
   * Django endpoint: GET /api/aggregates/summary/
   */
  async getSummary(filters?: {
    project?: string;
    period?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<Array<{
    indicator_id: number;
    indicator_name: string;
    total_value: number;
    period_count: number;
    trend: 'up' | 'down' | 'stable';
  }>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get('/aggregates/summary/', params);
    return data;
  },

  /**
   * Export aggregates to file
   * Django endpoint: GET /api/aggregates/export/
   */
  async export(filters?: AggregateFilters & { format?: 'csv' | 'excel' }): Promise<Blob> {
    const params = filters as Record<string, string>;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/aggregates/export/?${new URLSearchParams(params)}`,
      {
        headers: {
          Authorization: `Token ${localStorage.getItem('auth_token')}`,
        },
      }
    );
    return response.blob();
  },
};

export default aggregatesService;
