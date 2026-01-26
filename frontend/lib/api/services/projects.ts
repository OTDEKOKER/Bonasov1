/**
 * Projects Service
 * 
 * CRUD operations for projects, tasks, targets, and deadlines.
 * Django endpoint base: /api/manage/
 */

import { api, type PaginatedResponse } from '../client';
import type { Project, Task, Deadline } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface ProjectFilters {
  search?: string;
  status?: string;
  funder?: string;
  organization?: string;
  page?: string;
  page_size?: string;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  funder: string;
  description?: string;
  start_date: string;
  end_date: string;
  organization_id: number;
  indicator_ids?: number[];
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: 'active' | 'completed' | 'on_hold';
}

export interface TaskFilters {
  search?: string;
  status?: string;
  assigned_to?: string;
  project?: string;
  page?: string;
  page_size?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  project_id: number;
  assigned_to_id?: number;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

export interface DeadlineFilters {
  project?: string;
  indicator?: string;
  upcoming?: string;
  page?: string;
  page_size?: string;
}

export interface CreateDeadlineRequest {
  project_id: number;
  indicator_id: number;
  due_date: string;
  target_value: number;
  notes?: string;
}

export interface UpdateDeadlineRequest extends Partial<CreateDeadlineRequest> {
  status?: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  actual_value?: number;
}

export interface TargetRequest {
  project_id: number;
  indicator_id: number;
  target_value: number;
  period_start: string;
  period_end: string;
}

// ============================================================================
// Projects Service
// ============================================================================

export const projectsService = {
  /**
   * List all projects with optional filters
   * Django endpoint: GET /api/manage/projects/
   */
  async list(filters?: ProjectFilters): Promise<PaginatedResponse<Project>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Project>>('/manage/projects/', params);
    return data;
  },

  /**
   * Get a single project by ID
   * Django endpoint: GET /api/manage/projects/:id/
   */
  async get(id: number): Promise<Project> {
    const { data } = await api.get<Project>(`/manage/projects/${id}/`);
    return data;
  },

  /**
   * Create a new project
   * Django endpoint: POST /api/manage/projects/
   */
  async create(request: CreateProjectRequest): Promise<Project> {
    const { data } = await api.post<Project>('/manage/projects/', request);
    return data;
  },

  /**
   * Update a project
   * Django endpoint: PATCH /api/manage/projects/:id/
   */
  async update(id: number, request: UpdateProjectRequest): Promise<Project> {
    const { data } = await api.patch<Project>(`/manage/projects/${id}/`, request);
    return data;
  },

  /**
   * Delete a project
   * Django endpoint: DELETE /api/manage/projects/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/manage/projects/${id}/`);
  },

  /**
   * Get project dashboard stats
   * Django endpoint: GET /api/manage/projects/:id/stats/
   */
  async getStats(id: number): Promise<{
    total_indicators: number;
    completed_targets: number;
    pending_deadlines: number;
    progress_percentage: number;
  }> {
    const { data } = await api.get(`/manage/projects/${id}/stats/`);
    return data;
  },

  /**
   * Assign indicators to project
   * Django endpoint: POST /api/manage/projects/:id/assign-indicators/
   */
  async assignIndicators(id: number, indicatorIds: number[]): Promise<void> {
    await api.post(`/manage/projects/${id}/assign-indicators/`, { indicator_ids: indicatorIds });
  },

  /**
   * Set target for indicator in project
   * Django endpoint: POST /api/manage/projects/:id/targets/
   */
  async setTarget(id: number, request: TargetRequest): Promise<void> {
    await api.post(`/manage/projects/${id}/targets/`, request);
  },
};

// ============================================================================
// Tasks Service
// ============================================================================

export const tasksService = {
  /**
   * List all tasks with optional filters
   * Django endpoint: GET /api/manage/tasks/
   */
  async list(filters?: TaskFilters): Promise<PaginatedResponse<Task>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Task>>('/manage/tasks/', params);
    return data;
  },

  /**
   * Get a single task by ID
   * Django endpoint: GET /api/manage/tasks/:id/
   */
  async get(id: number): Promise<Task> {
    const { data } = await api.get<Task>(`/manage/tasks/${id}/`);
    return data;
  },

  /**
   * Create a new task
   * Django endpoint: POST /api/manage/tasks/
   */
  async create(request: CreateTaskRequest): Promise<Task> {
    const { data } = await api.post<Task>('/manage/tasks/', request);
    return data;
  },

  /**
   * Update a task
   * Django endpoint: PATCH /api/manage/tasks/:id/
   */
  async update(id: number, request: UpdateTaskRequest): Promise<Task> {
    const { data } = await api.patch<Task>(`/manage/tasks/${id}/`, request);
    return data;
  },

  /**
   * Delete a task
   * Django endpoint: DELETE /api/manage/tasks/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/manage/tasks/${id}/`);
  },

  /**
   * Mark task as complete
   * Django endpoint: POST /api/manage/tasks/:id/complete/
   */
  async complete(id: number): Promise<Task> {
    const { data } = await api.post<Task>(`/manage/tasks/${id}/complete/`);
    return data;
  },
};

// ============================================================================
// Deadlines Service
// ============================================================================

export const deadlinesService = {
  /**
   * List all deadlines with optional filters
   * Django endpoint: GET /api/manage/deadlines/
   */
  async list(filters?: DeadlineFilters): Promise<PaginatedResponse<Deadline>> {
    const params = filters as Record<string, string> | undefined;
    const { data } = await api.get<PaginatedResponse<Deadline>>('/manage/deadlines/', params);
    return data;
  },

  /**
   * Get a single deadline by ID
   * Django endpoint: GET /api/manage/deadlines/:id/
   */
  async get(id: number): Promise<Deadline> {
    const { data } = await api.get<Deadline>(`/manage/deadlines/${id}/`);
    return data;
  },

  /**
   * Create a new deadline
   * Django endpoint: POST /api/manage/deadlines/
   */
  async create(request: CreateDeadlineRequest): Promise<Deadline> {
    const { data } = await api.post<Deadline>('/manage/deadlines/', request);
    return data;
  },

  /**
   * Update a deadline
   * Django endpoint: PATCH /api/manage/deadlines/:id/
   */
  async update(id: number, request: UpdateDeadlineRequest): Promise<Deadline> {
    const { data } = await api.patch<Deadline>(`/manage/deadlines/${id}/`, request);
    return data;
  },

  /**
   * Delete a deadline
   * Django endpoint: DELETE /api/manage/deadlines/:id/
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/manage/deadlines/${id}/`);
  },

  /**
   * Get upcoming deadlines
   * Django endpoint: GET /api/manage/deadlines/upcoming/
   */
  async getUpcoming(days: number = 7): Promise<Deadline[]> {
    const { data } = await api.get<Deadline[]>('/manage/deadlines/upcoming/', { days: days.toString() });
    return data;
  },
};

;
