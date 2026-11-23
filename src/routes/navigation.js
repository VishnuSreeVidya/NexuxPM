import {
  FolderKanban,
  History,
  LayoutDashboard,
  ListChecks,
  Settings,
  UserRound,
} from 'lucide-react'
import { ROLES } from '../utils/constants'
import { PERMISSIONS, can } from '../utils/permissions'

export const NAV_SECTIONS = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        permission: PERMISSIONS.DASHBOARD_VIEW,
      },
      {
        id: 'projects',
        label: 'Projects',
        to: '/projects',
        icon: FolderKanban,
        permission: PERMISSIONS.PROJECT_VIEW,
        roles: [ROLES.SUPER_ADMIN, ROLES.PROJECT_LEAD, ROLES.TEAM_LEADER],
      },
      {
        id: 'tasks-developer',
        label: 'My Tasks',
        to: '/tasks',
        icon: ListChecks,
        permission: PERMISSIONS.TASK_VIEW,
        roles: [ROLES.DEVELOPER, ROLES.QA_ENGINEER],
      },
      {
        id: 'tasks-leader',
        label: 'Team Tasks',
        to: '/tasks',
        icon: ListChecks,
        permission: PERMISSIONS.TASK_VIEW,
        roles: [ROLES.TEAM_LEADER],
      },
      {
        id: 'activity',
        label: 'Activity',
        to: '/activity',
        icon: History,
        permission: PERMISSIONS.ACTIVITY_VIEW,
        roles: [ROLES.SUPER_ADMIN, ROLES.PROJECT_LEAD, ROLES.TEAM_LEADER],
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        id: 'profile',
        label: 'Profile',
        to: '/profile',
        icon: UserRound,
        permission: PERMISSIONS.PROFILE_VIEW,
      },
      {
        id: 'settings',
        label: 'Settings',
        to: '/settings',
        icon: Settings,
        permission: PERMISSIONS.SETTINGS_VIEW,
      },
    ],
  },
]

export function getNavigationForUser(user) {
  if (!user) return []
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.roles && !item.roles.includes(user.role)) return false
      return can(user, item.permission)
    }),
  })).filter((section) => section.items.length > 0)
}

export function getPageTitle(pathname, user) {
  const normalized = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname
  const sections = getNavigationForUser(user)
  for (const section of sections) {
    const match = section.items.find((item) => item.to === normalized)
    if (match) return match.label
  }
  return 'Page'
}
