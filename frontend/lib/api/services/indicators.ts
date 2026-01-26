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
  options?: string[]; // For multiselect/single_select types
  target_value?: number;
}

export interface UpdateIndicatorRequest extends Partial<CreateIndicatorRequest> {
  is_active?: boolean;
}

export interface AssessmentFilters {
  indicator?: string;
  respondent?: string;
  project?: string;
  date_from?: string;
  date_to?: string;
  page?: string;
  page_size?: string;
}

export interface CreateAssessmentRequest {
  indicator_id: number;
  respondent_id?: number;
  project_id: number;
  value: string | number | boolean | string[];
  date: string;
  notes?: string;
}

export interface UpdateAssessmentRequest extends Partial<CreateAssessmentRequest> {}

export interface BulkAssessmentRequest {
  project_id: number;
  respondent_id?: number;
  date: string;
  assessments: Array<{
    indicator_id: number;
    value: string | number | boolean | string[];
  }>;
}

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
  async getCategories(): Promise<string[]> {
    const { data } = await api.get<string[]>('/indicators/categories/');
    return data;
  },

  /**
   * Get indicators for dropdown select
   * Django endpoint: GET /api/indicators/choices/
   */
  async getChoices(): Promise<Array<{ id: number; name: string; code: string }>> {
    const { data } = await api.get<Array<{ id: number; name: string; code: string }>>('/indicators/choices/');
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
   * Django endpoint: GET /api/assessments/
   */
  async list(filters?: AssessmentFilters): Promise<PaginatedResponse<Assessment>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Assessment>>('/assessments/', params);
    return data;
  },

  /**
   * Get a single assessment by ID
   * Django endpoint: GET /api/assessments/:id/
   */
  async get(id: number): Promise<Assessment> {
    const { data } = await api.get<Assessment>(`/assessments/${id}/`);
    return data;
  },

  /**
   * Create a new assessment
   * Django endpoint: POST /api/assessments/
   */
  async create(request: CreateAssessmentRequest): Promise<Assessment> {
    const { data } = await api.post<Assessment>('/assessments/', request);
    return data;
  },

  /**
   * Update an assessment
   * Django endpoint: PATCH /api/assessments/:id/
   */
  async update(id: number, request: UpdateAssessmentRequest): Promise<Assessment> {
    const { data } = await api.patch<Assessment>(`/assessments/${id}/`, request);
    return data;
  },

  /**
   * Delete an assessment
   * Django endpoint: DELETE /api/assessments/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/assessments/${id}/`);
  },

  /**
   * Bulk create assessments (for forms with multiple indicators)
   * Django endpoint: POST /api/assessments/bulk/
   */
  async bulkCreate(request: BulkAssessmentRequest): Promise<Assessment[]> {
    const { data } = await api.post<Assessment[]>('/assessments/bulk/', request);
    return data;
  },

  /**
   * Get assessment history for a respondent
   * Django endpoint: GET /api/assessments/respondent/:id/history/
   */
  async getRespondentHistory(respondentId: number): Promise<Assessment[]> {
    const { data } = await api.get<Assessment[]>(`/assessments/respondent/${respondentId}/history/`);
    return data;
  },
};

export default indicatorsService;
