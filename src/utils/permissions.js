import { ROLES } from './constants'

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  PROJECT_VIEW: 'project:view',
  PROJECT_CREATE: 'project:create',
  PROJECT_EDIT: 'project:edit',
  PROJECT_DELETE: 'project:delete',
  PROJECT_ASSIGN_LEAD: 'project:assign-lead',
  PROJECT_ASSIGN_TEAM_LEADERS: 'project:assign-team-leaders',
  TASK_VIEW: 'task:view',
  TASK_CREATE: 'task:create',
  TASK_EDIT: 'task:edit',
  TASK_ASSIGN: 'task:assign',
  TASK_TRANSITION: 'task:transition',
  MILESTONE_VIEW: 'milestone:view',
  MILESTONE_MANAGE: 'milestone:manage',
  BUG_VIEW: 'bug:view',
  BUG_REPORT: 'bug:report',
  BUG_FIX: 'bug:fix',
  BUG_VERIFY: 'bug:verify',
  REPORT_VIEW: 'report:view',
  REPORT_VIEW_ALL: 'report:view-all',
  REPORT_SUBMIT: 'report:submit',
  USER_MANAGE: 'user:manage',
  DEPARTMENT_MANAGE: 'department:manage',
  TEAM_VIEW: 'team:view',
  ACTIVITY_VIEW: 'activity:view',
  NOTIFICATION_VIEW: 'notification:view',
  PROFILE_VIEW: 'profile:view',
  SETTINGS_VIEW: 'settings:view',
}

const COMMON_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.PROFILE_VIEW,
  PERMISSIONS.SETTINGS_VIEW,
]

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    ...COMMON_PERMISSIONS,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_EDIT,
    PERMISSIONS.PROJECT_DELETE,
    PERMISSIONS.PROJECT_ASSIGN_LEAD,
    PERMISSIONS.TASK_VIEW,
    PERMISSIONS.MILESTONE_VIEW,
    PERMISSIONS.MILESTONE_MANAGE,
    PERMISSIONS.BUG_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_VIEW_ALL,
    PERMISSIONS.REPORT_SUBMIT,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.DEPARTMENT_MANAGE,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
  ],
  [ROLES.PROJECT_LEAD]: [
    ...COMMON_PERMISSIONS,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.PROJECT_ASSIGN_TEAM_LEADERS,
    PERMISSIONS.TASK_VIEW,
    PERMISSIONS.MILESTONE_VIEW,
    PERMISSIONS.MILESTONE_MANAGE,
    PERMISSIONS.BUG_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_SUBMIT,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
  ],
  [ROLES.TEAM_LEADER]: [
    ...COMMON_PERMISSIONS,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.TASK_VIEW,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_TRANSITION,
    PERMISSIONS.MILESTONE_VIEW,
    PERMISSIONS.BUG_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
  ],
  [ROLES.DEVELOPER]: [
    ...COMMON_PERMISSIONS,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.TASK_VIEW,
    PERMISSIONS.TASK_TRANSITION,
    PERMISSIONS.BUG_VIEW,
    PERMISSIONS.BUG_FIX,
  ],
  [ROLES.QA_ENGINEER]: [
    ...COMMON_PERMISSIONS,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.TASK_VIEW,
    PERMISSIONS.TASK_TRANSITION,
    PERMISSIONS.BUG_VIEW,
    PERMISSIONS.BUG_REPORT,
    PERMISSIONS.BUG_VERIFY,
  ],
}

export function can(user, permission) {
  if (!user || !permission) return false
  const permissions = ROLE_PERMISSIONS[user.role]
  if (!permissions) return false
  return permissions.includes(permission)
}

export function canAny(user, permissions = []) {
  return permissions.some((permission) => can(user, permission))
}

export function canAll(user, permissions = []) {
  return permissions.every((permission) => can(user, permission))
}

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] ?? []
}
