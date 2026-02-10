// Users
export const mockUsers = [
  {
    id: '1',
    email: 'admin@bonaso.org',
    firstName: 'Sarah',
    lastName: 'Moyo',
    role: 'admin',
    organizationId: '1',
    avatar: '/avatars/sarah.jpg',
    createdAt: '2024-01-15',
    lastLogin: '2025-01-22',
  },
  {
    id: '2',
    email: 'john@partner.org',
    firstName: 'John',
    lastName: 'Banda',
    role: 'officer',
    organizationId: '2',
    createdAt: '2024-03-20',
    lastLogin: '2025-01-21',
  },
  {
    id: '3',
    email: 'grace@ngo.org',
    firstName: 'Grace',
    lastName: 'Phiri',
    role: 'manager',
    organizationId: '3',
    createdAt: '2024-05-10',
    lastLogin: '2025-01-20',
  },
  {
    id: '4',
    email: 'client@funder.org',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'client',
    organizationId: '1',
    clientOrganizationId: '4',
    createdAt: '2024-06-01',
    lastLogin: '2025-01-19',
  },
]

// Organizations
export const mockOrganizations = [
  {
    id: '1',
    name: 'BONASO',
    type: 'ngo',
    contactEmail: 'info@bonaso.org',
    contactPhone: '+267 123 4567',
    address: 'Gaborone, Botswana',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Health Partners International',
    type: 'partner',
    parentId: '1',
    contactEmail: 'info@hpi.org',
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    name: 'Community Health Network',
    type: 'ngo',
    parentId: '1',
    contactEmail: 'info@chn.org',
    createdAt: '2024-03-01',
  },
  {
    id: '4',
    name: 'Global Health Fund',
    type: 'funder',
    contactEmail: 'grants@ghf.org',
    createdAt: '2024-01-01',
  },
  {
    id: '5',
    name: 'Ministry of Health',
    type: 'government',
    contactEmail: 'info@moh.gov.bw',
    createdAt: '2024-01-01',
  },
]

// Indicators
export const mockIndicators = [
  {
    id: '1',
    name: 'HIV Testing Completed',
    code: 'HIV_TEST',
    description: 'Number of individuals who completed HIV testing',
    category: 'hiv_prevention',
    type: 'yes_no',
    allowAggregate: true,
    isRequired: true,
    assessmentId: '1',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'HIV Test Result',
    code: 'HIV_RESULT',
    description: 'Result of HIV test',
    category: 'hiv_prevention',
    type: 'single_select',
    allowAggregate: true,
    isRequired: true,
    assessmentId: '1',
    options: [
      { id: '1', indicatorId: '2', label: 'Positive', value: 'positive', order: 1 },
      { id: '2', indicatorId: '2', label: 'Negative', value: 'negative', order: 2 },
      { id: '3', indicatorId: '2', label: 'Inconclusive', value: 'inconclusive', order: 3 },
    ],
    createdAt: '2024-01-01',
  },
  {
    id: '3',
    name: 'Referral to Care',
    code: 'REFERRAL',
    description: 'Was the individual referred to care services',
    category: 'hiv_prevention',
    type: 'yes_no',
    allowAggregate: true,
    isRequired: false,
    assessmentId: '1',
    createdAt: '2024-01-01',
  },
  {
    id: '4',
    name: 'Social Media Reach',
    code: 'SOCIAL_REACH',
    description: 'Number of people reached through social media',
    category: 'hiv_prevention',
    type: 'number',
    allowAggregate: false,
    isRequired: true,
    createdAt: '2024-01-01',
  },
  {
    id: '5',
    name: 'Training Events Conducted',
    code: 'TRAINING_EVENTS',
    description: 'Number of training events conducted',
    category: 'events',
    type: 'number',
    allowAggregate: true,
    isRequired: true,
    createdAt: '2024-01-01',
  },
  {
    id: '6',
    name: 'Organizations Trained',
    code: 'ORGS_TRAINED',
    description: 'Number of organizations that received training',
    category: 'events',
    type: 'number',
    allowAggregate: true,
    isRequired: true,
    createdAt: '2024-01-01',
  },
]

// Assessments
export const mockAssessments = [
  {
    id: '1',
    name: 'HIV Testing Assessment',
    description: 'Standard assessment for HIV testing services',
    indicators: mockIndicators.filter(i => i.assessmentId === '1'),
    createdAt: '2024-01-01',
  },
]

// Projects
export const mockProjects = [
  {
    id: '1',
    name: 'HIV Prevention Program 2025',
    code: 'HPP2025',
    description: 'Comprehensive HIV prevention and testing program',
    funderId: '4',
    clientOrganizationId: '4',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'active',
    organizationIds: ['1', '2', '3'],
    createdAt: '2024-12-01',
  },
  {
    id: '2',
    name: 'Community Health Outreach',
    code: 'CHO2025',
    description: 'Community-based health education and outreach',
    funderId: '4',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    status: 'active',
    organizationIds: ['1', '3'],
    createdAt: '2024-11-15',
  },
  {
    id: '3',
    name: 'Capacity Building Initiative',
    code: 'CBI2024',
    description: 'Training and capacity building for partner organizations',
    funderId: '5',
    startDate: '2024-07-01',
    endDate: '2024-12-31',
    status: 'completed',
    organizationIds: ['1', '2'],
    createdAt: '2024-06-01',
  },
]

// Tasks
export const mockTasks = [
  {
    id: '1',
    projectId: '1',
    organizationId: '1',
    indicatorId: '1',
    target: 5000,
    achieved: 3420,
    status: 'in_progress',
  },
  {
    id: '2',
    projectId: '1',
    organizationId: '2',
    indicatorId: '1',
    target: 3000,
    achieved: 2150,
    status: 'in_progress',
  },
  {
    id: '3',
    projectId: '1',
    organizationId: '3',
    indicatorId: '1',
    target: 2000,
    achieved: 1890,
    status: 'in_progress',
  },
  {
    id: '4',
    projectId: '2',
    organizationId: '1',
    indicatorId: '5',
    target: 50,
    achieved: 35,
    status: 'in_progress',
  },
]

// Deadlines
export const mockDeadlines = [
  {
    id: '1',
    projectId: '1',
    title: 'Q1 Progress Report',
    description: 'Submit quarterly progress report to funder',
    dueDate: '2025-04-15',
    isCompleted: false,
  },
  {
    id: '2',
    projectId: '1',
    title: 'Mid-Year Review',
    description: 'Mid-year program review and assessment',
    dueDate: '2025-07-01',
    isCompleted: false,
  },
  {
    id: '3',
    projectId: '2',
    title: 'Monthly Data Submission',
    description: 'Submit monthly activity data',
    dueDate: '2025-02-05',
    isCompleted: false,
  },
]

// Respondents
export const mockRespondents = [
  {
    id: '1',
    idNumber: 'BW1234567',
    isAnonymous: false,
    firstName: 'Thabo',
    lastName: 'Molefe',
    dateOfBirth: '1990-05-15',
    sex: 'male',
    ageRange: '30-39',
    district: 'Gaborone',
    hivStatus: 'negative',
    createdAt: '2025-01-10',
    createdById: '2',
  },
  {
    id: '2',
    idNumber: 'BW7654321',
    isAnonymous: false,
    firstName: 'Keabetswe',
    lastName: 'Motswana',
    dateOfBirth: '1985-08-20',
    sex: 'female',
    ageRange: '35-44',
    district: 'Francistown',
    hivStatus: 'positive',
    createdAt: '2025-01-12',
    createdById: '2',
  },
  {
    id: '3',
    isAnonymous: true,
    sex: 'female',
    ageRange: '20-24',
    district: 'Maun',
    createdAt: '2025-01-15',
    createdById: '3',
  },
]

// Events
export const mockEvents = [
  {
    id: '1',
    name: 'HIV Awareness Workshop',
    description: 'Community workshop on HIV prevention and testing',
    hostOrganizationId: '1',
    participantOrganizationIds: ['2', '3'],
    taskIds: ['4'],
    date: '2025-01-20',
    location: 'Gaborone Community Center',
    status: 'completed',
    attendeeCount: 150,
    createdAt: '2025-01-05',
  },
  {
    id: '2',
    name: 'Partner Training Session',
    description: 'Training session for partner organization staff',
    hostOrganizationId: '1',
    participantOrganizationIds: ['2'],
    taskIds: ['4'],
    date: '2025-02-15',
    location: 'BONASO Office',
    status: 'planned',
    createdAt: '2025-01-18',
  },
]

// Social Media Posts
export const mockSocialPosts = [
  {
    id: '1',
    platform: 'facebook',
    postUrl: 'https://facebook.com/bonaso/posts/123',
    postDate: '2025-01-15',
    taskIds: ['1'],
    metrics: {
      likes: 245,
      comments: 32,
      shares: 18,
      views: 3500,
      reach: 2800,
    },
    isFlagged: false,
    createdAt: '2025-01-15',
  },
  {
    id: '2',
    platform: 'twitter',
    postUrl: 'https://twitter.com/bonaso/status/456',
    postDate: '2025-01-18',
    taskIds: ['1'],
    metrics: {
      likes: 89,
      comments: 12,
      shares: 45,
      views: 1200,
      reach: 950,
    },
    isFlagged: false,
    createdAt: '2025-01-18',
  },
  {
    id: '3',
    platform: 'instagram',
    postUrl: 'https://instagram.com/p/abc123',
    postDate: '2025-01-20',
    taskIds: ['1'],
    metrics: {
      likes: 520,
      comments: 67,
      shares: 25,
      views: 4200,
      reach: 3100,
    },
    isFlagged: false,
    createdAt: '2025-01-20',
  },
]

// Flags
export const mockFlags = [
  {
    id: '1',
    type: 'duplicate',
    status: 'open',
    message: 'Potential duplicate respondent detected based on ID number',
    entityType: 'respondent',
    entityId: '1',
    createdAt: '2025-01-20',
  },
  {
    id: '2',
    type: 'logic_error',
    status: 'open',
    message: 'Referral count exceeds testing count for this period',
    entityType: 'aggregate',
    entityId: '1',
    createdAt: '2025-01-19',
  },
  {
    id: '3',
    type: 'invalid_data',
    status: 'resolved',
    message: 'Invalid date format in response',
    entityType: 'interaction',
    entityId: '5',
    createdAt: '2025-01-15',
    resolvedAt: '2025-01-16',
    resolvedById: '1',
  },
]

// Dashboard Stats
export interface DashboardStats {
  totalRespondents: number
  totalInteractions: number
  activeProjects: number
  pendingFlags: number
  targetAchievement: number
  monthlyTrend: { month: string; value: number }[]
  indicatorProgress: { name: string; target: number; achieved: number }[]
  recentActivity: { type: string; description: string; timestamp: string; user: string }[]
}

export const mockDashboardStats: DashboardStats = {
  totalRespondents: 8547,
  totalInteractions: 12893,
  activeProjects: 2,
  pendingFlags: 2,
  targetAchievement: 68,
  monthlyTrend: [
    { month: 'Aug', value: 1200 },
    { month: 'Sep', value: 1450 },
    { month: 'Oct', value: 1680 },
    { month: 'Nov', value: 1890 },
    { month: 'Dec', value: 2100 },
    { month: 'Jan', value: 2340 },
  ],
  indicatorProgress: [
    { name: 'HIV Testing', target: 10000, achieved: 7460 },
    { name: 'Referrals', target: 2000, achieved: 1520 },
    { name: 'Training Events', target: 50, achieved: 35 },
    { name: 'Social Reach', target: 50000, achieved: 32500 },
  ],
  recentActivity: [
    { type: 'interaction', description: 'New interaction recorded', timestamp: '2 minutes ago', user: 'John Banda' },
    { type: 'respondent', description: 'New respondent registered', timestamp: '15 minutes ago', user: 'Grace Phiri' },
    { type: 'event', description: 'Event marked as completed', timestamp: '1 hour ago', user: 'Sarah Moyo' },
    { type: 'flag', description: 'Data flag resolved', timestamp: '2 hours ago', user: 'Sarah Moyo' },
    { type: 'report', description: 'Monthly report generated', timestamp: '3 hours ago', user: 'John Banda' },
  ],
}
