import React from "react"
// User & Auth Types
export type UserRole = 'admin' | 'me_officer' | 'me_manager' | 'client'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
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
  type: 'ngo' | 'government' | 'partner' | 'funder'
  parentId?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  createdAt: string
}

// Indicator Types
export type IndicatorCategory = 'assessment' | 'social' | 'event_count' | 'orgs_capacitated' | 'misc'
export type IndicatorType = 'yes_no' | 'number' | 'open_text' | 'multiselect' | 'single_select' | 'numbers_by_category'

export interface Indicator {
  id: string
  name: string
  code: string
  description?: string
  category: IndicatorCategory
  type: IndicatorType
  allowAggregate: boolean
  isRequired: boolean
  assessmentId?: string
  options?: IndicatorOption[]
  createdAt: string
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
  indicators: Indicator[]
  createdAt: string
}

// Project Types
export interface Project {
  id: string
  name: string
  code: string
  description?: string
  funderId?: string
  clientOrganizationId?: string
  startDate: string
  endDate: string
  status: 'active' | 'completed' | 'draft'
  organizationIds: string[]
  createdAt: string
}

export interface Task {
  id: string
  projectId: string
  organizationId: string
  indicatorId: string
  target?: number
  achieved?: number
  status: 'pending' | 'in_progress' | 'completed'
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
  projectId: string
  title: string
  description?: string
  dueDate: string
  isCompleted: boolean
}

// Respondent Types
export interface Respondent {
  id: string
  idNumber?: string
  isAnonymous: boolean
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  sex: 'male' | 'female' | 'other'
  ageRange?: string
  district?: string
  hivStatus?: 'positive' | 'negative' | 'unknown'
  createdAt: string
  createdById: string
}

export interface Interaction {
  id: string
  respondentId: string
  taskId: string
  date: string
  responses: Response[]
  createdAt: string
  createdById: string
}

export interface Response {
  id: string
  interactionId: string
  indicatorId: string
  booleanValue?: boolean
  textValue?: string
  numberValue?: number
  optionId?: string
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

// Event Types
export interface Event {
  id: string
  name: string
  description?: string
  hostOrganizationId: string
  participantOrganizationIds: string[]
  taskIds: string[]
  date: string
  location?: string
  status: 'planned' | 'completed' | 'cancelled'
  attendeeCount?: number
  createdAt: string
}

// Social Media Types
export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube'

export interface SocialMediaPost {
  id: string
  platform: SocialPlatform
  postUrl?: string
  postDate: string
  taskIds: string[]
  metrics: SocialMetrics
  isFlagged: boolean
  createdAt: string
}

export interface SocialMetrics {
  likes: number
  comments: number
  shares: number
  views: number
  reach: number
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
export type FlagType = 'duplicate' | 'invalid_data' | 'logic_error' | 'manual'
export type FlagStatus = 'open' | 'resolved' | 'dismissed'

export interface Flag {
  id: string
  type: FlagType
  status: FlagStatus
  message: string
  entityType: string
  entityId: string
  createdAt: string
  resolvedAt?: string
  resolvedById?: string
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
