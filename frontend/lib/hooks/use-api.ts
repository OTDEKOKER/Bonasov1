'use client';

/**
 * SWR Hooks for API Data Fetching
 * 
 * These hooks provide data fetching with caching, revalidation, and error handling.
 * 
 * Usage:
 *   const { data: projects, isLoading, error, mutate } = useProjects({ status: 'active' });
 */

import useSWR, { type SWRConfiguration } from 'swr';
import {
  projectsService,
  tasksService,
  deadlinesService,
  organizationsService,
  usersService,
  indicatorsService,
  assessmentsService,
  respondentsService,
  interactionsService,
  eventsService,
  socialPostsService,
  uploadsService,
  aggregatesService,
  reportsService,
  analysisService,
  flagsService,
  dashboardChartsService,
  type ProjectFilters,
  type TaskFilters,
  type DeadlineFilters,
  type OrganizationFilters,
  type UserFilters,
  type IndicatorFilters,
  type AssessmentFilters,
  type RespondentFilters,
  type InteractionFilters,
  type EventFilters,
  type SocialPostFilters,
  type UploadFilters,
  type AggregateFilters,
  type ReportFilters,
  type FlagFilters,
} from '@/lib/api';

// Default SWR config
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  shouldRetryOnError: false,
};

// ============================================================================
// Organizations Hooks
// ============================================================================

export function useOrganizations(filters?: OrganizationFilters, config?: SWRConfiguration) {
  return useSWR(
    ['organizations', filters],
    () => organizationsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useAllOrganizations(filters?: OrganizationFilters, config?: SWRConfiguration) {
  return useSWR(
    ['organizations-all', filters],
    async () => {
      const results = await organizationsService.listAll(filters);
      return { count: results.length, next: null, previous: null, results };
    },
    { ...defaultConfig, ...config }
  );
}

export function useOrganization(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['organization', id] : null,
    () => organizationsService.get(id!),
    { ...defaultConfig, ...config }
  );
}

export function useOrganizationTree(config?: SWRConfiguration) {
  return useSWR(
    'organizations-tree',
    () => organizationsService.getTree(),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Users Hooks
// ============================================================================

export function useUsers(filters?: UserFilters, config?: SWRConfiguration) {
  return useSWR(
    ['users', filters],
    () => usersService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useUser(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['user', id] : null,
    () => usersService.get(id!),
    { ...defaultConfig, ...config }
  );
}

export function useUserPermissions(config?: SWRConfiguration) {
  return useSWR(
    'user-permissions',
    () => usersService.listPermissions(),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Projects Hooks
// ============================================================================

export function useProjects(filters?: ProjectFilters, config?: SWRConfiguration) {
  return useSWR(
    ['projects', filters],
    () => projectsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useProject(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['project', id] : null,
    () => projectsService.get(id!),
    { ...defaultConfig, ...config }
  );
}

export function useAllProjects(filters?: ProjectFilters, config?: SWRConfiguration) {
  return useSWR(
    ['projects-all', filters],
    async () => {
      const results = await projectsService.listAll(filters);
      return { count: results.length, next: null, previous: null, results };
    },
    { ...defaultConfig, ...config }
  );
}
export function useProjectStats(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['project-stats', id] : null,
    () => projectsService.getStats(id!),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Tasks Hooks
// ============================================================================

export function useTasks(filters?: TaskFilters, config?: SWRConfiguration) {
  return useSWR(
    ['tasks', filters],
    () => tasksService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useTask(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['task', id] : null,
    () => tasksService.get(id!),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Deadlines Hooks
// ============================================================================

export function useDeadlines(filters?: DeadlineFilters, config?: SWRConfiguration) {
  return useSWR(
    ['deadlines', filters],
    () => deadlinesService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useDeadline(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['deadline', id] : null,
    () => deadlinesService.get(id!),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Indicators Hooks
// ============================================================================

export function useIndicators(filters?: IndicatorFilters, config?: SWRConfiguration) {
  return useSWR(
    ['indicators', filters],
    () => indicatorsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useAllIndicators(filters?: IndicatorFilters, config?: SWRConfiguration) {
  return useSWR(
    ['indicators-all', filters],
    () => indicatorsService.listAll(filters),
    { ...defaultConfig, ...config }
  );
}

export function useIndicator(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['indicator', id] : null,
    () => indicatorsService.get(id!),
    { ...defaultConfig, ...config }
  );
}

export function useIndicatorCategories(config?: SWRConfiguration) {
  return useSWR(
    'indicator-categories',
    () => indicatorsService.getCategories(),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Assessments Hooks
// ============================================================================

export function useAssessments(filters?: AssessmentFilters, config?: SWRConfiguration) {
  return useSWR(
    ['assessments', filters],
    () => assessmentsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useAssessment(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['assessment', id] : null,
    () => assessmentsService.get(id!),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Respondents Hooks
// ============================================================================

export function useRespondents(filters?: RespondentFilters, config?: SWRConfiguration) {
  return useSWR(
    ['respondents', filters],
    () => respondentsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useRespondent(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['respondent', id] : null,
    () => respondentsService.get(id!),
    { ...defaultConfig, ...config }
  );
}

export function useRespondentProfile(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['respondent-profile', id] : null,
    () => respondentsService.getProfile(id!),
    { ...defaultConfig, ...config }
  );
}

export function useRespondentStats(config?: SWRConfiguration) {
  return useSWR(
    'respondent-stats',
    () => respondentsService.getStats(),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Interactions Hooks
// ============================================================================

export function useInteractions(filters?: InteractionFilters, config?: SWRConfiguration) {
  return useSWR(
    ['interactions', filters],
    () => interactionsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Events Hooks
// ============================================================================

export function useEvents(filters?: EventFilters, config?: SWRConfiguration) {
  return useSWR(
    ['events', filters],
    () => eventsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useEvent(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['event', id] : null,
    () => eventsService.get(id!),
    { ...defaultConfig, ...config }
  );
}

export function useUpcomingEvents(days?: number, config?: SWRConfiguration) {
  return useSWR(
    ['upcoming-events', days],
    () => eventsService.getUpcoming(days),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Social Posts Hooks
// ============================================================================

export function useSocialPosts(filters?: SocialPostFilters, config?: SWRConfiguration) {
  return useSWR(
    ['social-posts', filters],
    () => socialPostsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Uploads Hooks
// ============================================================================

export function useUploads(filters?: UploadFilters, config?: SWRConfiguration) {
  return useSWR(
    ['uploads', filters],
    () => uploadsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useAllUploads(filters?: UploadFilters, config?: SWRConfiguration) {
  return useSWR(
    ['uploads-all', filters],
    () => uploadsService.listAll(filters),
    { ...defaultConfig, ...config }
  );
}

export function useUpload(id: number | null, config?: SWRConfiguration) {
  return useSWR(
    id ? ['upload', id] : null,
    () => uploadsService.get(id!),
    { ...defaultConfig, ...config }
  );
}

export function useImportJobs(filters?: { status?: string; upload?: string }, config?: SWRConfiguration) {
  return useSWR(
    ['import-jobs', filters],
    () => uploadsService.listImports(filters),
    { ...defaultConfig, ...config }
  );
}
// ============================================================================
// Aggregates Hooks
// ============================================================================

export function useAggregates(filters?: AggregateFilters, config?: SWRConfiguration) {
  return useSWR(
    ['aggregates', filters],
    () => aggregatesService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useAllAggregates(filters?: AggregateFilters, config?: SWRConfiguration) {
  return useSWR(
    ['aggregates-all', filters],
    () => aggregatesService.listAll(filters),
    { ...defaultConfig, ...config }
  );
}

export function useAggregateTemplates(
  filters?: { project?: string; organization?: string },
  config?: SWRConfiguration
) {
  return useSWR(
    ['aggregate-templates', filters],
    () => aggregatesService.getTemplates(filters),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Reports Hooks
// ============================================================================

export function useReports(filters?: ReportFilters, config?: SWRConfiguration) {
  return useSWR(
    ['reports', filters],
    () => reportsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useDashboardCharts(config?: SWRConfiguration) {
  return useSWR(
    'dashboard-charts',
    () => dashboardChartsService.list(),
    { ...defaultConfig, ...config }
  );
}

export function useScheduledReports(config?: SWRConfiguration) {
  return useSWR(
    'scheduled-reports',
    () => reportsService.listScheduled(),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Analysis Hooks
// ============================================================================

export function useDashboardStats(projectId?: number, config?: SWRConfiguration) {
  return useSWR(
    ['dashboard', projectId],
    () => analysisService.getDashboard(projectId),
    { ...defaultConfig, ...config }
  );
}

export function useIndicatorTrends(
  indicatorId: number | null,
  params?: {
    months?: number;
    projectId?: number | null;
    organizationId?: number | null;
    dateFrom?: string;
    dateTo?: string;
  },
  config?: SWRConfiguration,
) {
  return useSWR(
    indicatorId ? ['indicator-trends', indicatorId, params] : null,
    () => analysisService.getIndicatorTrends(indicatorId!, params),
    { ...defaultConfig, ...config }
  );
}

export function useIndicatorTrendsBulk(
  indicatorIds: number[] | null,
  params?: {
    months?: number;
    projectId?: number | null;
    organizationId?: number | null;
    dateFrom?: string;
    dateTo?: string;
  },
  config?: SWRConfiguration,
) {
  return useSWR(
    indicatorIds && indicatorIds.length ? ['indicator-trends-bulk', indicatorIds, params] : null,
    () => analysisService.getIndicatorTrendsBulk(indicatorIds!, params),
    { ...defaultConfig, ...config }
  );
}

// ============================================================================
// Flags Hooks
// ============================================================================

export function useFlags(filters?: FlagFilters, config?: SWRConfiguration) {
  return useSWR(
    ['flags', filters],
    () => flagsService.list(filters),
    { ...defaultConfig, ...config }
  );
}

export function useFlagStats(config?: SWRConfiguration) {
  return useSWR(
    'flag-stats',
    () => flagsService.getStats(),
    { ...defaultConfig, ...config }
  );
}










