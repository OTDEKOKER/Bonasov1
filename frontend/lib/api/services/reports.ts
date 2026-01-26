/**
 * Reports & Analysis Service
 * 
 * Operations for generating reports, data analysis, and flags.
 * Django endpoint base: /api/reports/ and /api/analysis/
 */

import { api, type PaginatedResponse } from '../client';
import type { Flag } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface Report {
  id: number;
  name: string;
  type: 'indicator_summary' | 'project_progress' | 'respondent_demographics' | 'custom';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  parameters: Record<string, unknown>;
  file_url?: string;
  created_at: string;
  completed_at?: string;
  created_by: number;
}

export interface ReportFilters {
  search?: string;
  type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: string;
  page_size?: string;
}

export interface CreateReportRequest {
  name: string;
  type: Report['type'];
  parameters: {
    project_id?: number;
    indicator_ids?: number[];
    date_from?: string;
    date_to?: string;
    organization_id?: number;
    include_disaggregation?: boolean;
    format?: 'pdf' | 'excel' | 'csv';
  };
}

export interface ScheduledReport {
  id: number;
  report_name: string;
  report_type: Report['type'];
  parameters: Record<string, unknown>;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  is_active: boolean;
  next_run: string;
  last_run?: string;
}

export interface CreateScheduledReportRequest {
  report_name: string;
  report_type: Report['type'];
  parameters: Record<string, unknown>;
  frequency: ScheduledReport['frequency'];
  recipients: string[];
}

export interface AnalysisQuery {
  indicators: number[];
  projects?: number[];
  date_from?: string;
  date_to?: string;
  group_by?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  disaggregate_by?: string[];
}

export interface AnalysisResult {
  indicator_id: number;
  indicator_name: string;
  data: Array<{
    period: string;
    value: number;
    target?: number;
    disaggregation?: Record<string, number>;
  }>;
  summary: {
    total: number;
    average: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    percent_change: number;
  };
}

export interface FlagFilters {
  search?: string;
  type?: string;
  status?: string;
  severity?: string;
  indicator?: string;
  page?: string;
  page_size?: string;
}

export interface CreateFlagRequest {
  type: 'missing_data' | 'outlier' | 'duplicate' | 'inconsistent' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  indicator_id?: number;
  respondent_id?: number;
  record_id?: number;
  record_type?: string;
}

export interface UpdateFlagRequest {
  status?: 'open' | 'in_review' | 'resolved' | 'dismissed';
  resolution_notes?: string;
  assigned_to_id?: number;
}

// ============================================================================
// Reports Service
// ============================================================================

export const reportsService = {
  /**
   * List all reports with optional filters
   * Django endpoint: GET /api/reports/
   */
  async list(filters?: ReportFilters): Promise<PaginatedResponse<Report>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Report>>('/reports/', params);
    return data;
  },

  /**
   * Get a single report by ID
   * Django endpoint: GET /api/reports/:id/
   */
  async get(id: number): Promise<Report> {
    const { data } = await api.get<Report>(`/reports/${id}/`);
    return data;
  },

  /**
   * Generate a new report
   * Django endpoint: POST /api/reports/
   */
  async create(request: CreateReportRequest): Promise<Report> {
    const { data } = await api.post<Report>('/reports/', request);
    return data;
  },

  /**
   * Delete a report
   * Django endpoint: DELETE /api/reports/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/reports/${id}/`);
  },

  /**
   * Download report file
   * Django endpoint: GET /api/reports/:id/download/
   */
  async download(id: number): Promise<Blob> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/reports/${id}/download/`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      }
    );
    return response.blob();
  },

  /**
   * List scheduled reports
   * Django endpoint: GET /api/reports/scheduled/
   */
  async listScheduled(): Promise<ScheduledReport[]> {
    const { data } = await api.get<ScheduledReport[]>('/reports/scheduled/');
    return data;
  },

  /**
   * Create a scheduled report
   * Django endpoint: POST /api/reports/scheduled/
   */
  async createScheduled(request: CreateScheduledReportRequest): Promise<ScheduledReport> {
    const { data } = await api.post<ScheduledReport>('/reports/scheduled/', request);
    return data;
  },

  /**
   * Update a scheduled report
   * Django endpoint: PATCH /api/reports/scheduled/:id/
   */
  async updateScheduled(
    id: number, 
    request: Partial<CreateScheduledReportRequest> & { is_active?: boolean }
  ): Promise<ScheduledReport> {
    const { data } = await api.patch<ScheduledReport>(`/reports/scheduled/${id}/`, request);
    return data;
  },

  /**
   * Delete a scheduled report
   * Django endpoint: DELETE /api/reports/scheduled/:id/
   */
  async deleteScheduled(id: number): Promise<void> {
    await api.delete(`/reports/scheduled/${id}/`);
  },

  /**
   * Get available report types
   * Django endpoint: GET /api/reports/types/
   */
  async getTypes(): Promise<Array<{ value: string; label: string; description: string }>> {
    const { data } = await api.get('/reports/types/');
    return data;
  },
};

// ============================================================================
// Analysis Service
// ============================================================================

export const analysisService = {
  /**
   * Run analysis query
   * Django endpoint: POST /api/analysis/query/
   */
  async query(request: AnalysisQuery): Promise<AnalysisResult[]> {
    const { data } = await api.post<AnalysisResult[]>('/analysis/query/', request);
    return data;
  },

  /**
   * Get dashboard stats
   * Django endpoint: GET /api/analysis/dashboard/
   */
  async getDashboard(projectId?: number): Promise<{
    total_respondents: number;
    total_assessments: number;
    active_projects: number;
    indicators_on_track: number;
    indicators_behind: number;
    recent_activity: Array<{
      type: string;
      description: string;
      timestamp: string;
    }>;
  }> {
    const params = projectId ? { project: projectId.toString() } : undefined;
    const { data } = await api.get('/analysis/dashboard/', params);
    return data;
  },

  /**
   * Get indicator trends
   * Django endpoint: GET /api/analysis/trends/:indicatorId/
   */
  async getIndicatorTrends(indicatorId: number, months: number = 12): Promise<{
    data: Array<{ month: string; value: number; target: number }>;
    trend: 'up' | 'down' | 'stable';
    forecast: number;
  }> {
    const { data } = await api.get(`/analysis/trends/${indicatorId}/`, { months: months.toString() });
    return data;
  },

  /**
   * Compare indicators across projects
   * Django endpoint: POST /api/analysis/compare/
   */
  async compareIndicators(request: {
    indicator_id: number;
    project_ids: number[];
    date_from?: string;
    date_to?: string;
  }): Promise<Array<{
    project_id: number;
    project_name: string;
    value: number;
    target: number;
    progress: number;
  }>> {
    const { data } = await api.post('/analysis/compare/', request);
    return data;
  },
};

// ============================================================================
// Flags Service
// ============================================================================

export const flagsService = {
  /**
   * List all flags with optional filters
   * Django endpoint: GET /api/flags/
   */
  async list(filters?: FlagFilters): Promise<PaginatedResponse<Flag>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Flag>>('/flags/', params);
    return data;
  },

  /**
   * Get a single flag by ID
   * Django endpoint: GET /api/flags/:id/
   */
  async get(id: number): Promise<Flag> {
    const { data } = await api.get<Flag>(`/flags/${id}/`);
    return data;
  },

  /**
   * Create a new flag
   * Django endpoint: POST /api/flags/
   */
  async create(request: CreateFlagRequest): Promise<Flag> {
    const { data } = await api.post<Flag>('/flags/', request);
    return data;
  },

  /**
   * Update a flag
   * Django endpoint: PATCH /api/flags/:id/
   */
  async update(id: number, request: UpdateFlagRequest): Promise<Flag> {
    const { data } = await api.patch<Flag>(`/flags/${id}/`, request);
    return data;
  },

  /**
   * Delete a flag
   * Django endpoint: DELETE /api/flags/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/flags/${id}/`);
  },

  /**
   * Get flag statistics
   * Django endpoint: GET /api/flags/stats/
   */
  async getStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
  }> {
    const { data } = await api.get('/flags/stats/');
    return data;
  },

  /**
   * Run automated data quality checks
   * Django endpoint: POST /api/flags/run-checks/
   */
  async runChecks(projectId?: number): Promise<{
    flags_created: number;
    checks_run: string[];
  }> {
    const { data } = await api.post('/flags/run-checks/', { project_id: projectId });
    return data;
  },
};

export default reportsService;
