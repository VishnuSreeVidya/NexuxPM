import { ROLES, TASK_STATUSES } from './constants'

export function getProjectTasks(state, projectId) {
  return state.tasks.filter((task) => task.projectId === projectId)
}

export function isProjectLead(user, project) {
  return Boolean(user && project && project.leadId === user.id)
}

export function isProjectTeamLeader(user, project) {
  return Boolean(user && project && project.teamLeaderIds?.includes(user.id))
}

export function getUserTaskProjectIds(state, userId) {
  const ids = new Set()
  state.tasks.forEach((task) => {
    if (task.assigneeId === userId || task.qaId === userId) ids.add(task.projectId)
  })
  return ids
}

export function getAccessibleProjectIds(state, user) {
  if (!user) return new Set()
  switch (user.role) {
    case ROLES.SUPER_ADMIN:
      return new Set(state.projects.map((project) => project.id))
    case ROLES.PROJECT_LEAD:
      return new Set(
        state.projects.filter((project) => project.leadId === user.id).map((project) => project.id),
      )
    case ROLES.TEAM_LEADER:
      return new Set(
        state.projects
          .filter((project) => project.teamLeaderIds?.includes(user.id))
          .map((project) => project.id),
      )
    case ROLES.DEVELOPER:
    case ROLES.QA_ENGINEER:
      return getUserTaskProjectIds(state, user.id)
    default:
      return new Set()
  }
}

export function canViewProject(state, user, project) {
  if (!user || !project) return false
  if (user.role === ROLES.SUPER_ADMIN) return true
  if (user.role === ROLES.PROJECT_LEAD) return project.leadId === user.id
  if (user.role === ROLES.TEAM_LEADER) return Boolean(project.teamLeaderIds?.includes(user.id))
  return getAccessibleProjectIds(state, user).has(project.id)
}

export function canViewTask(state, user, task) {
  if (!user || !task) return false
  if (user.role === ROLES.SUPER_ADMIN) return true
  if (task.assigneeId === user.id || task.qaId === user.id) return true
  const project = state.projects.find((item) => item.id === task.projectId)
  if (!project) return false
  if (user.role === ROLES.PROJECT_LEAD) return project.leadId === user.id
  if (user.role === ROLES.TEAM_LEADER) return Boolean(project.teamLeaderIds?.includes(user.id))
  return false
}

export function canManageTeamLeaders(user, project) {
  return Boolean(user && project && user.role === ROLES.PROJECT_LEAD && project.leadId === user.id)
}

export function canCreateTaskForProject(user, project) {
  return Boolean(
    user && project && user.role === ROLES.TEAM_LEADER && project.teamLeaderIds?.includes(user.id),
  )
}

export function canEditTask(user, task, state) {
  if (!user || !task) return false
  if (user.role === ROLES.SUPER_ADMIN) return false
  if (user.role === ROLES.TEAM_LEADER) {
    const project = state.projects.find((item) => item.id === task.projectId)
    return Boolean(project?.teamLeaderIds?.includes(user.id))
  }
  return false
}

const TASK_TRANSITIONS = {
  [TASK_STATUSES.TODO]: [TASK_STATUSES.IN_PROGRESS],
  [TASK_STATUSES.IN_PROGRESS]: [TASK_STATUSES.IN_REVIEW],
  [TASK_STATUSES.IN_REVIEW]: [TASK_STATUSES.TESTING, TASK_STATUSES.IN_PROGRESS],
  [TASK_STATUSES.TESTING]: [TASK_STATUSES.COMPLETED, TASK_STATUSES.IN_PROGRESS],
  [TASK_STATUSES.COMPLETED]: [TASK_STATUSES.IN_PROGRESS],
}

export function getAllowedTransitions(task) {
  return TASK_TRANSITIONS[task?.status] ?? []
}

export function canTransitionTask(state, user, task, toStatus) {
  if (!user || !task) return false
  if (!TASK_TRANSITIONS[task.status]?.includes(toStatus)) return false
  if (user.role === ROLES.SUPER_ADMIN) return false

  if (user.role === ROLES.TEAM_LEADER) {
    const project = state.projects.find((item) => item.id === task.projectId)
    const isLeader = Boolean(project?.teamLeaderIds?.includes(user.id))
    return isLeader && toStatus !== TASK_STATUSES.COMPLETED
  }

  if (user.role === ROLES.DEVELOPER) {
    if (task.assigneeId !== user.id) return false
    return (
      (task.status === TASK_STATUSES.TODO && toStatus === TASK_STATUSES.IN_PROGRESS) ||
      (task.status === TASK_STATUSES.IN_PROGRESS && toStatus === TASK_STATUSES.IN_REVIEW)
    )
  }

  if (user.role === ROLES.QA_ENGINEER) {
    if (task.qaId !== user.id) return false
    return (
      (task.status === TASK_STATUSES.IN_REVIEW && toStatus === TASK_STATUSES.TESTING) ||
      (task.status === TASK_STATUSES.TESTING &&
        [TASK_STATUSES.COMPLETED, TASK_STATUSES.IN_PROGRESS].includes(toStatus))
    )
  }

  return false
}
