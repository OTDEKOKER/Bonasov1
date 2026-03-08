/**
 * Aggregates Service
 * 
 * CRUD operations for aggregate data (tabular data without respondent linking).
 * Django endpoint base: /api/aggregates/
 */

import { api, fetchWithAuth, normalizeApiError, type PaginatedResponse } from '../client';
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
  indicator: number;
  project: number;
  organization: number;
  period_start: string;
  period_end: string;
  value: unknown;
  notes?: string;
}

export type UpdateAggregateRequest = Partial<CreateAggregateRequest>

export interface BulkAggregateRequest {
  project: number;
  organization: number;
  period_start: string;
  period_end: string;
  data: Array<{
    indicator: number;
    value: unknown;
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

export interface GenerateFromInteractionsRequest {
  output_indicator: number;
  source_indicator: number;
  operator?: 'equals' | 'not_equals' | 'contains';
  match_value?: unknown;
  count_distinct?: 'respondent' | 'interaction';
  project: number;
  organization: number;
  period_start: string;
  period_end: string;
  save_rule?: boolean;
  save_aggregate?: boolean;
}

export interface GenerateFromInteractionsResponse {
  computed: number;
  rule: unknown;
  aggregate?: Aggregate | null;
}

export interface DerivationRule {
  id: number;
  output_indicator: number;
  output_indicator_code?: string;
  output_indicator_name?: string;
  source_indicator: number;
  source_indicator_code?: string;
  source_indicator_name?: string;
  operator: 'equals' | 'not_equals' | 'contains';
  match_value?: unknown;
  count_distinct: 'respondent' | 'interaction';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Drop undefined/empty filters so we do not send project=undefined.
const cleanParams = (filters?: Record<string, string | undefined | null>) => {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params[key] = String(value);
  }
  return Object.keys(params).length ? params : undefined;
};

// ============================================================================
// Aggregates Service
// ============================================================================

export const aggregatesService = {
  /**
   * List all aggregates with optional filters
   * Django endpoint: GET /api/aggregates/
   */
  async list(filters?: AggregateFilters): Promise<PaginatedResponse<Aggregate>> {
    const params = cleanParams(filters as Record<string, string | undefined>);
    const { data } = await api.get<PaginatedResponse<Aggregate>>('/aggregates/', params);
    return data;
  },
  /**
   * List all aggregates across all pages
   */
  async listAll(filters?: AggregateFilters): Promise<Aggregate[]> {
    const results: Aggregate[] = [];
    const startPage = Math.max(1, Number(filters?.page || 1));
    const baseFilters = cleanParams({ ...(filters || {}) } as Record<string, string | undefined>) || {};
    delete baseFilters.page;

    const { data: firstPage } = await api.get<PaginatedResponse<Aggregate>>('/aggregates/', {
      ...baseFilters,
      page: String(startPage),
    });

    const firstPageResults = firstPage.results || [];
    results.push(...firstPageResults);

    const pageSize = firstPageResults.length;
    const totalCount = Number(firstPage.count || firstPageResults.length);
    if (!firstPage.next || pageSize === 0) {
      return results;
    }

    const totalPages = Math.ceil(totalCount / pageSize);
    if (!Number.isFinite(totalPages) || totalPages <= startPage) {
      return results;
    }

    const pageRequests: Promise<{ data: PaginatedResponse<Aggregate> }>[] = [];
    for (let page = startPage + 1; page <= totalPages; page += 1) {
      pageRequests.push(
        api.get<PaginatedResponse<Aggregate>>('/aggregates/', {
          ...baseFilters,
          page: String(page),
        })
      );
    }

    const remainingPages = await Promise.all(pageRequests);
    remainingPages.forEach(({ data }) => {
      results.push(...(data.results || []));
    });

    return results;
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
   * Django endpoint: POST /api/aggregates/bulk_create/
   */
  async bulkCreate(request: BulkAggregateRequest): Promise<Aggregate[]> {
    const { data } = await api.post<{ results: Aggregate[] }>('/aggregates/bulk_create/', request);
    return data.results || [];
  },

  /**
   * Get aggregate templates (predefined indicator sets)
   * Django endpoint: GET /api/aggregates/templates/
   */
  async getTemplates(filters?: { project?: string; organization?: string }): Promise<AggregateTemplate[]> {
    const params = cleanParams(filters as Record<string, string | undefined>);
    const { data } = await api.get<AggregateTemplate[]>('/aggregates/templates/', params);
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
    const params = cleanParams(filters as Record<string, string | undefined>);
    const { data } = await api.get('/aggregates/summary/', params);
    return data as Array<{
      indicator_id: number;
      indicator_name: string;
      total_value: number;
      period_count: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  },

  /**
   * Export aggregates to file
   * Django endpoint: GET /api/aggregates/export/
   */
  async export(filters?: AggregateFilters & { format?: 'csv' | 'excel' }): Promise<Blob> {
    const params = cleanParams(filters as Record<string, string | undefined>);
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await fetchWithAuth(`/aggregates/export/${qs}`);
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      const payload = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();
      throw normalizeApiError({
        status: response.status,
        payload,
        fallbackMessage: 'Failed to export aggregates',
      });
    }
    return response.blob();
  },

  /**
   * Generate an aggregate value from interaction responses (and optionally save rule + aggregate)
   * Django endpoint: POST /api/aggregates/generate_from_interactions/
   */
  async generateFromInteractions(
    request: GenerateFromInteractionsRequest,
  ): Promise<GenerateFromInteractionsResponse> {
    const { data } = await api.post<GenerateFromInteractionsResponse>(
      '/aggregates/generate_from_interactions/',
      request,
    );
    return data;
  },

  /**
   * List derivation rules
   * Django endpoint: GET /api/aggregates/derivation-rules/
   */
  async listDerivationRules(filters?: {
    output_indicator?: string;
    source_indicator?: string;
    is_active?: string;
    page?: string;
    page_size?: string;
  }): Promise<PaginatedResponse<DerivationRule>> {
    const params = cleanParams(filters as Record<string, string | undefined>);
    const { data } = await api.get<PaginatedResponse<DerivationRule>>(
      '/aggregates/derivation-rules/',
      params,
    );
    return data;
  },
};

export default aggregatesService;



