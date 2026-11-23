export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PROJECT_LEAD: 'PROJECT_LEAD',
  TEAM_LEADER: 'TEAM_LEADER',
  DEVELOPER: 'DEVELOPER',
  QA_ENGINEER: 'QA_ENGINEER',
}

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.PROJECT_LEAD]: 'Project Lead',
  [ROLES.TEAM_LEADER]: 'Team Leader',
  [ROLES.DEVELOPER]: 'Developer',
  [ROLES.QA_ENGINEER]: 'QA Engineer',
}

export const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: 'Organization-wide control and oversight',
  [ROLES.PROJECT_LEAD]: 'Delivery health across assigned projects',
  [ROLES.TEAM_LEADER]: 'Team execution and task delivery',
  [ROLES.DEVELOPER]: 'Personal workstream and delivery',
  [ROLES.QA_ENGINEER]: 'Quality assurance and defect management',
}

export const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Quality Assurance', 'Operations']

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  TESTING: 'testing',
  COMPLETED: 'completed',
}

export const TASK_STATUS_ORDER = [
  TASK_STATUSES.TODO,
  TASK_STATUSES.IN_PROGRESS,
  TASK_STATUSES.IN_REVIEW,
  TASK_STATUSES.TESTING,
  TASK_STATUSES.COMPLETED,
]

export const TASK_STATUS_META = {
  [TASK_STATUSES.TODO]: { label: 'To Do', tone: 'neutral', color: '#94A3B8' },
  [TASK_STATUSES.IN_PROGRESS]: { label: 'In Progress', tone: 'primary', color: '#2563EB' },
  [TASK_STATUSES.IN_REVIEW]: { label: 'In Review', tone: 'warning', color: '#D97706' },
  [TASK_STATUSES.TESTING]: { label: 'Testing', tone: 'violet', color: '#7C3AED' },
  [TASK_STATUSES.COMPLETED]: { label: 'Completed', tone: 'success', color: '#16A34A' },
  'To do': { label: 'To do', tone: 'gray' },
  'In progress': { label: 'In progress', tone: 'blue' },
  'In review': { label: 'In review', tone: 'purple' },
  Testing: { label: 'Testing', tone: 'orange' },
  Completed: { label: 'Completed', tone: 'green' },
}

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

export const TASK_PRIORITY_META = {
  [TASK_PRIORITIES.LOW]: { label: 'Low', tone: 'neutral', color: '#64748B', weight: 1 },
  [TASK_PRIORITIES.MEDIUM]: { label: 'Medium', tone: 'info', color: '#2563EB', weight: 2 },
  [TASK_PRIORITIES.HIGH]: { label: 'High', tone: 'warning', color: '#EA580C', weight: 3 },
  [TASK_PRIORITIES.CRITICAL]: { label: 'Critical', tone: 'danger', color: '#DC2626', weight: 4 },
}

export const PROJECT_STATUSES = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
}

export const PROJECT_STATUS_META = {
  [PROJECT_STATUSES.PLANNING]: { label: 'Planning', tone: 'violet', color: '#7C3AED' },
  [PROJECT_STATUSES.ACTIVE]: { label: 'Active', tone: 'primary', color: '#2563EB' },
  [PROJECT_STATUSES.ON_HOLD]: { label: 'On Hold', tone: 'warning', color: '#D97706' },
  [PROJECT_STATUSES.COMPLETED]: { label: 'Completed', tone: 'success', color: '#16A34A' },
  'On track': { label: 'On track', tone: 'green' },
  'At risk': { label: 'At risk', tone: 'orange' },
  Complete: { label: 'Complete', tone: 'blue' },
}

export const MILESTONE_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DELAYED: 'delayed',
}

export const MILESTONE_STATUS_META = {
  [MILESTONE_STATUSES.PENDING]: { label: 'Pending', tone: 'neutral' },
  [MILESTONE_STATUSES.IN_PROGRESS]: { label: 'In Progress', tone: 'primary' },
  [MILESTONE_STATUSES.COMPLETED]: { label: 'Completed', tone: 'success' },
  [MILESTONE_STATUSES.DELAYED]: { label: 'Delayed', tone: 'danger' },
}

export const BUG_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  FIXED: 'fixed',
  VERIFIED: 'verified',
  REOPENED: 'reopened',
}

export const BUG_STATUS_META = {
  [BUG_STATUSES.OPEN]: { label: 'Open', tone: 'danger' },
  [BUG_STATUSES.IN_PROGRESS]: { label: 'Fixing', tone: 'warning' },
  [BUG_STATUSES.FIXED]: { label: 'Ready to Verify', tone: 'violet' },
  [BUG_STATUSES.VERIFIED]: { label: 'Verified', tone: 'success' },
  [BUG_STATUSES.REOPENED]: { label: 'Reopened', tone: 'danger' },
}

export const BUG_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

export const BUG_SEVERITY_META = {
  [BUG_SEVERITIES.LOW]: { label: 'Low', tone: 'neutral' },
  [BUG_SEVERITIES.MEDIUM]: { label: 'Medium', tone: 'info' },
  [BUG_SEVERITIES.HIGH]: { label: 'High', tone: 'warning' },
  [BUG_SEVERITIES.CRITICAL]: { label: 'Critical', tone: 'danger' },
}

export const NOTIFICATION_TYPES = {
  TASK: 'task',
  PROJECT: 'project',
  BUG: 'bug',
  REPORT: 'report',
  SYSTEM: 'system',
}

export const SESSION_KEY = 'nexuspm:session:v1'
export const DATA_KEY = 'nexuspm:data:v1'
export const SCHEMA_VERSION = 1
