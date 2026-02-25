/**
 * Indicators & Assessments Service
 * 
 * CRUD operations for indicators and assessments.
 * Django endpoint base: /api/indicators/
 */

import { api, type PaginatedResponse } from '../client';
import type { Indicator, Assessment, IndicatorType } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorFilters {
  search?: string;
  type?: IndicatorType;
  category?: string;
  is_active?: string;
  page?: string;
  page_size?: string;
}

export interface CreateIndicatorRequest {
  name: string;
  code: string;
  description?: string;
  type: IndicatorType;
  category?: string;
  unit?: string;
  options?: Array<string | { label: string; value: string }>;
  sub_labels?: string[];
  aggregation_method?: 'sum' | 'average' | 'count' | 'latest';
  is_active?: boolean;
  organizations?: number[];
}

export interface UpdateIndicatorRequest extends Partial<CreateIndicatorRequest> {
  is_active?: boolean;
}

export interface AssessmentFilters {
  is_active?: string;
  organizations?: string;
  page?: string;
  page_size?: string;
}

export interface CreateAssessmentRequest {
  name: string;
  description?: string;
  indicators?: number[];
  logic_rules?: Record<string, unknown>;
  is_active?: boolean;
  organizations?: number[];
}

export interface UpdateAssessmentRequest extends Partial<CreateAssessmentRequest> {}

// ============================================================================
// Indicators Service
// ============================================================================

export const indicatorsService = {
  /**
   * List all indicators with optional filters
   * Django endpoint: GET /api/indicators/
   */
  async list(filters?: IndicatorFilters): Promise<PaginatedResponse<Indicator>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Indicator>>('/indicators/', params);
    return data;
  },
  /**
   * List all indicators across all pages
   */
  async listAll(filters?: IndicatorFilters): Promise<Indicator[]> {
    const results: Indicator[] = [];
    let page = filters?.page ? String(filters.page) : "1";
    const baseFilters = { ...(filters || {}) } as Record<string, string>;
    delete (baseFilters as any).page;

    while (true) {
      const { data } = await api.get<PaginatedResponse<Indicator>>('/indicators/', {
        ...baseFilters,
        page,
      });
      results.push(...(data.results || []));
      if (!data.next) break;
      try {
        const nextUrl = new URL(data.next);
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
   * Get a single indicator by ID
   * Django endpoint: GET /api/indicators/:id/
   */
  async get(id: number): Promise<Indicator> {
    const { data } = await api.get<Indicator>(`/indicators/${id}/`);
    return data;
  },

  /**
   * Create a new indicator
   * Django endpoint: POST /api/indicators/
   */
  async create(request: CreateIndicatorRequest): Promise<Indicator> {
    const { data } = await api.post<Indicator>('/indicators/', request);
    return data;
  },

  /**
   * Update an indicator
   * Django endpoint: PATCH /api/indicators/:id/
   */
  async update(id: number, request: UpdateIndicatorRequest): Promise<Indicator> {
    const { data } = await api.patch<Indicator>(`/indicators/${id}/`, request);
    return data;
  },

  /**
   * Delete an indicator
   * Django endpoint: DELETE /api/indicators/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/indicators/${id}/`);
  },

  /**
   * Get indicator categories for filtering
   * Django endpoint: GET /api/indicators/categories/
   */
  async getCategories(): Promise<Array<{ value: string; label: string }>> {
    const { data } = await api.get<Array<{ value: string; label: string }>>('/indicators/categories/');
    return data;
  },

  /**
   * Get indicators for dropdown select
   * Django endpoint: GET /api/indicators/choices/
   */
  async getChoices(): Promise<Array<{ id: number; name: string; code: string }>> {
    const { data } = await api.get<Array<{ id: number; name: string; code: string }>>('/indicators/simple/');
    return data;
  },

  /**
   * Get indicator statistics
   * Django endpoint: GET /api/indicators/:id/stats/
   */
  async getStats(id: number): Promise<{
    total_assessments: number;
    unique_respondents: number;
    average_value: number | null;
    completion_rate: number;
  }> {
    const { data } = await api.get(`/indicators/${id}/stats/`);
    return data;
  },
};

// ============================================================================
// Assessments Service
// ============================================================================

export const assessmentsService = {
  /**
   * List all assessments with optional filters
   * Django endpoint: GET /api/indicators/assessments/
   */
  async list(filters?: AssessmentFilters): Promise<PaginatedResponse<Assessment>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Assessment>>('/indicators/assessments/', params);
    return data;
  },

  /**
   * Get a single assessment by ID
   * Django endpoint: GET /api/indicators/assessments/:id/
   */
  async get(id: number): Promise<Assessment> {
    const { data } = await api.get<Assessment>(`/indicators/assessments/${id}/`);
    return data;
  },

  /**
   * Create a new assessment
   * Django endpoint: POST /api/indicators/assessments/
   */
  async create(request: CreateAssessmentRequest): Promise<Assessment> {
    const { data } = await api.post<Assessment>('/indicators/assessments/', request);
    return data;
  },

  /**
   * Update an assessment
   * Django endpoint: PATCH /api/indicators/assessments/:id/
   */
  async update(id: number, request: UpdateAssessmentRequest): Promise<Assessment> {
    const { data } = await api.patch<Assessment>(`/indicators/assessments/${id}/`, request);
    return data;
  },

  /**
   * Delete an assessment
   * Django endpoint: DELETE /api/indicators/assessments/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/indicators/assessments/${id}/`);
  },
  async addIndicator(
    assessmentId: number,
    indicatorId: number,
    order: number = 0,
    isRequired: boolean = true,
  ): Promise<void> {
    await api.post(`/indicators/assessments/${assessmentId}/add_indicator/`, {
      indicator_id: indicatorId,
      order,
      is_required: isRequired,
    });
  },

  async removeIndicator(assessmentId: number, indicatorId: number): Promise<void> {
    await api.post(`/indicators/assessments/${assessmentId}/remove_indicator/`, {
      indicator_id: indicatorId,
    });
  },
};

export default indicatorsService;
