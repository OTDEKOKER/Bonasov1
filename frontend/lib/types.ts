import React from "react"
// User & Auth Types
export type UserRole = 'admin' | 'manager' | 'officer' | 'collector' | 'client'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  permissions?: string[]
  organizationId: string
  clientOrganizationId?: string
  avatar?: string
  createdAt: string
  lastLogin?: string
}

export interface Profile extends User {
  phone?: string
  jobTitle?: string
  department?: string
}

// Organization Types
export interface Organization {
  id: string
  name: string
  type: 'headquarters' | 'regional' | 'district' | 'partner'
  code?: string
  parentId?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  description?: string
  is_active?: boolean
  createdAt: string
}

// Indicator Types
export type IndicatorCategory = 'hiv_prevention' | 'ncd' | 'events'
export type IndicatorType =
  | 'yes_no'
  | 'number'
  | 'percentage'
  | 'text'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'multi_int'

export interface Indicator {
  id: string
  name: string
  code: string
  description?: string
  category: IndicatorCategory
  type: IndicatorType
  unit?: string
  options?: Array<string | { label: string; value: string }>
  sub_labels?: string[]
  aggregation_method?: 'sum' | 'average' | 'count' | 'latest'
  is_active: boolean
  organizations?: string[]
  created_at: string
  updated_at: string
}

export interface IndicatorOption {
  id: string
  indicatorId: string
  label: string
  value: string
  order: number
}

export interface Assessment {
  id: string
  name: string
  description?: string
  indicators: string[]
  indicators_detail?: Array<{
    id: string
    assessment: string
    indicator: string
    indicator_detail?: {
      id: string
      name: string
      code: string
      type: IndicatorType
      category: IndicatorCategory
    }
    order: number
    is_required: boolean
    depends_on?: string | null
    condition_value?: unknown
  }>
  indicators_count?: number
  logic_rules?: Record<string, unknown>
  is_active: boolean
  organizations?: string[]
  created_at: string
  updated_at: string
}

// Project Types
export interface Project {
  id: string
  name: string
  code: string
  description?: string
  funder?: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  start_date: string
  end_date: string
  organizations: string[]
  indicators_count?: number
  tasks_count?: number
  progress_percentage?: number
  created_at: string
  updated_at: string
  project_indicators?: Array<{
    id: string
    project: string
    indicator: string
    indicator_name?: string
    indicator_code?: string
    target_value: number
    current_value: number
    baseline_value: number
    progress: number
  }>
}

export interface Task {
  id: string
  project: string
  project_name?: string
  name: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string | null
  assigned_to_name?: string
  due_date?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface Target {
  id: string
  taskId: string
  value: number
  period: 'monthly' | 'quarterly' | 'yearly'
  startDate: string
  endDate: string
}

export interface ProjectDeadline {
  id: string
  project: string
  project_name?: string
  name: string
  description?: string
  due_date: string
  status: 'pending' | 'submitted' | 'approved' | 'overdue'
  indicators?: string[]
  submitted_at?: string | null
  submitted_by?: string | null
  submitted_by_name?: string
  days_remaining?: number | null
  created_at: string
  updated_at: string
}

// Respondent Types
export interface Respondent {
  id: string
  unique_id: string
  first_name: string
  last_name: string
  full_name?: string
  gender?: 'male' | 'female' | 'other'
  date_of_birth?: string | null
  phone?: string
  email?: string
  address?: string
  organization: string
  organization_name?: string
  demographics?: Record<string, unknown>
  is_active: boolean
  interactions_count?: number
  last_interaction?: string | null
  interactions?: Interaction[]
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  respondent: string
  respondent_name?: string
  assessment?: string | null
  assessment_name?: string | null
  project?: string | null
  project_name?: string | null
  date: string
  notes?: string
  responses?: Response[]
  responses_count?: number
  created_at: string
  updated_at: string
}

export interface Response {
  id: string
  interaction: string
  indicator: string
  indicator_name?: string
  indicator_code?: string
  indicator_type?: IndicatorType
  value: unknown
  created_at: string
  updated_at: string
}

// Aggregate Types
export interface AggregateGroup {
  id: string
  projectId: string
  indicatorId: string
  organizationId: string
  periodStart: string
  periodEnd: string
  counts: AggregateCount[]
  createdAt: string
}

export interface AggregateCount {
  id: string
  groupId: string
  sex?: string
  ageRange?: string
  optionId?: string
  value: number
  isFlagged: boolean
}
export interface Aggregate {
  id: string
  indicator: string
  indicator_name?: string
  indicator_code?: string
  project: string
  project_name?: string
  organization: string
  organization_name?: string
  period_start: string
  period_end: string
  value: unknown
  notes?: string
  created_at: string
  updated_at: string
}

// Event Types
export interface Event {
  id: string
  title: string
  description?: string
  type: 'training' | 'meeting' | 'outreach' | 'workshop' | 'other'
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled'
  project?: string | null
  project_name?: string
  organization: string
  organization_name?: string
  participating_organizations?: string[]
  start_date: string
  end_date?: string | null
  location?: string
  expected_participants?: number
  actual_participants?: number
  participants_count?: number
  attendance_rate?: number
  budget?: number
  actual_cost?: number
  indicators?: string[]
  checkin_token?: string
  participants?: EventParticipant[]
  phases?: EventPhase[]
  created_at: string
  updated_at: string
}

export interface EventParticipant {
  id: string
  event: string
  respondent?: string | null
  respondent_name?: string
  name?: string
  gender?: string
  contact?: string
  attended?: boolean
  notes?: string
  created_at?: string
}

export interface EventPhase {
  id: string
  event: string
  title: string
  description?: string
  status: 'planned' | 'ongoing' | 'completed'
  due_date?: string | null
  created_at?: string
}

export interface SocialPost {
  id: string
  title: string
  indicator: string
  indicator_name?: string
  organization?: string | null
  organization_name?: string
  platform: 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'other'
  url: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
  interactions?: number
  last_synced?: string | null
  created_at: string
  updated_at: string
}

// Upload Types
export interface NarrativeReport {
  id: string
  title: string
  projectId: string
  organizationId: string
  fileUrl: string
  fileType: 'pdf' | 'docx'
  uploadedById: string
  createdAt: string
}

// Analysis Types
export interface AnalysisQuery {
  projectId?: string
  organizationId?: string
  indicatorIds?: string[]
  startDate?: string
  endDate?: string
  groupBy?: 'organization' | 'period' | 'indicator'
}

export interface AnalysisResult {
  indicator: Indicator
  organization?: Organization
  period?: string
  target: number
  achieved: number
  percentage: number
}

// Flag Types
export type FlagType = 'data_quality' | 'follow_up' | 'urgent' | 'review' | 'other'
export type FlagStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed'
export type FlagPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Flag {
  id: string
  flag_type: FlagType
  status: FlagStatus
  priority: FlagPriority
  title: string
  description: string
  content_type: string
  object_id: string
  organization: string
  assigned_to?: string | null
  resolution_notes?: string
  resolved_at?: string | null
  resolved_by?: string | null
  created_at: string
  updated_at: string
}

// Navigation Types
export interface NavItem {
  title: string
  href: string
  icon: string
  badge?: number
  children?: NavItem[]
}

// Table Types
export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
}


