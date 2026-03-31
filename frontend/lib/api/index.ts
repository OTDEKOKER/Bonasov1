/**
 * BONASO Data Portal - API Services
 * 
 * Central export for all API services.
 * 
 * Usage:
 *   import { authService, projectsService } from '@/lib/api';
 *   
 *   // Login
 *   const { token, user } = await authService.login({ username, password });
 *   
 *   // Fetch projects
 *   const projects = await projectsService.list({ status: 'active' });
 * 
 * Configuration:
 *   Set NEXT_PUBLIC_API_URL in your environment variables to point to your Django API.
 *   Example: NEXT_PUBLIC_API_URL=https://api.bonaso.org/api
 */

// Core client
export {
  api,
  fetchWithAuth,
  normalizeApiError,
  setAuthToken,
  clearAuthToken,
  setAuthTokens,
  clearAuthTokens,
  getRefreshToken,
} from './client';
export type { ApiResponse, ApiError, PaginatedResponse } from './client';

// Authentication
export { authService } from './services/auth';
export type {
  LoginCredentials,
  LoginResponse,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
} from './services/auth';

// Organizations
export { organizationsService } from './services/organizations';
export type {
  OrganizationFilters,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from './services/organizations';

// Users
export { usersService } from './services/users';
export type {
  UserFilters,
  CreateUserRequest,
  UpdateUserRequest,
  UserActivity,
  UserPermissionOption,
} from './services/users';

// Projects, Tasks & Deadlines
export { projectsService, tasksService, deadlinesService } from './services/projects';
export type {
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  DeadlineFilters,
  CreateDeadlineRequest,
  UpdateDeadlineRequest,
  TargetRequest,
} from './services/projects';

// Indicators & Assessments
export { indicatorsService, assessmentsService } from './services/indicators';
export type {
  IndicatorFilters,
  CreateIndicatorRequest,
  UpdateIndicatorRequest,
  AssessmentFilters,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
} from './services/indicators';

// Respondents & Interactions
export { respondentsService, interactionsService, responsesService } from './services/respondents';
export type {
  RespondentFilters,
  CreateRespondentRequest,
  UpdateRespondentRequest,
  InteractionFilters,
  CreateInteractionRequest,
  UpdateInteractionRequest,
  ResponseFilters,
  CreateResponseRequest,
  UpdateResponseRequest,
  RespondentImportRequest,
  RespondentExportRequest,
} from './services/respondents';

// Events
export { eventsService } from './services/events';
export type {
  EventFilters,
  CreateEventRequest,
  UpdateEventRequest,
  EventParticipant,
  AddParticipantRequest,
} from './services/events';

// Social Media
export { socialPostsService } from './services/social';
export type { SocialPostFilters, CreateSocialPostRequest, UpdateSocialPostRequest } from './services/social';

// Aggregates
export { aggregatesService } from './services/aggregates';
export type {
  AggregateFilters,
  CreateAggregateRequest,
  UpdateAggregateRequest,
  BulkAggregateRequest,
  AggregateTemplate,
  DerivationRule,
} from './services/aggregates';

// Reports, Analysis & Flags
export { reportsService, analysisService, flagsService, dashboardChartsService } from './services/reports';
export type {
  Report,
  DashboardChart,
  ReportFilters,
  CreateReportRequest,
  ScheduledReport,
  CreateScheduledReportRequest,
  AnalysisQuery,
  AnalysisResult,
  FlagFilters,
  CreateFlagRequest,
  UpdateFlagRequest,
} from './services/reports';

// Legacy Analytics
export { dashboardSettingsService, pivotTablesService, lineListsService, requestLogsService } from './services/analytics';
export type {
  ChartField,
  ChartFieldName,
  ChartFilter,
  LegacyChartType,
  LegacyChartAxis,
  IndicatorChartSetting,
  DashboardIndicatorChart,
  DashboardFilter,
  DashboardSetting,
  DashboardMeta,
  DashboardSettingsFilters,
  DashboardSettingRequest,
  DashboardChartRequest,
  PivotTable,
  PivotTableFilters,
  PivotTableRequest,
  LineList,
  LineListFilters,
  LineListRequest,
  RequestLog,
} from './services/analytics';

// Coordinator Portfolio Targets
export { coordinatorTargetsService } from "./services/coordinator-targets";
export type {
  CoordinatorTargetQuarter,
  CoordinatorTarget,
  CoordinatorTargetFilters,
  CreateCoordinatorTargetRequest,
  UpdateCoordinatorTargetRequest,
  CoordinatorTargetBulkAssignRequest,
  CoordinatorTargetChildContribution,
  CoordinatorTargetPerformanceRow,
} from "./services/coordinator-targets";

// Excel Report Workbooks
export { reportWorkbooksService } from './services/report-workbooks';
export type {
  WorkbookImportStatus,
  WorkbookIssueSeverity,
  WorkbookExportScope,
  WorkbookSheetRole,
  FinancialQuarterCode,
  WorkbookTemplateSummary,
  WorkbookTemplateMatch,
  WorkbookTablePreview,
  WorkbookQuarterTargetMap,
  WorkbookIndicatorAssignmentPreview,
  WorkbookMissingIndicatorCandidate,
  WorkbookSheetAnalysis,
  WorkbookValidationIssue,
  WorkbookImportSummary,
  WorkbookImportSession,
  WorkbookImportFilters,
  CreateWorkbookImportRequest,
  ConfirmWorkbookImportRequest,
  CreateMissingIndicatorsRequest,
  WorkbookExportRequest,
  WorkbookExportJob,
} from './services/report-workbooks';
export {
  buildMissingIndicatorPayload,
  buildCreateMissingIndicatorsRequest,
} from './services/report-workbooks';


// Uploads
export { uploadsService } from './services/uploads';
export type { UploadFilters, CreateUploadRequest, UpdateUploadRequest, UploadRecord, ImportJob } from './services/uploads';

// Messaging
export { notificationsService } from './services/messaging';
export type { NotificationFilters } from './services/messaging';
