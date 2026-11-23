import { ROLES, TASK_STATUSES, PROJECT_STATUSES, TASK_STATUS_ORDER } from './constants'
import { getAccessibleProjectIds, getProjectTasks, getUserTaskProjectIds } from './access'
import { daysUntil, isOverdueDate } from './dateUtils'

export function getUserById(state, userId) {
  return state.users.find((user) => user.id === userId) ?? null
}

export function getProjectById(state, projectId) {
  return state.projects.find((project) => project.id === projectId) ?? null
}

export function getTaskById(state, taskId) {
  return state.tasks.find((task) => task.id === taskId) ?? null
}

export function getMilestoneById(state, milestoneId) {
  return state.milestones.find((milestone) => milestone.id === milestoneId) ?? null
}

export function getProjectMilestones(state, projectId) {
  return state.milestones
    .filter((milestone) => milestone.projectId === projectId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function getProjectTaskCounts(state, projectId) {
  const tasks = getProjectTasks(state, projectId)
  return TASK_STATUS_ORDER.reduce(
    (counts, status) => ({
      ...counts,
      [status]: tasks.filter((task) => task.status === status).length,
    }),
    { total: tasks.length },
  )
}

export function getProjectProgress(state, projectId) {
  const tasks = getProjectTasks(state, projectId)
  if (!tasks.length) return 0
  const completed = tasks.filter((task) => task.status === TASK_STATUSES.COMPLETED).length
  return Math.round((completed / tasks.length) * 100)
}

export function getAverageProgress(state, projects) {
  if (!projects.length) return 0
  const total = projects.reduce((sum, project) => sum + getProjectProgress(state, project.id), 0)
  return Math.round(total / projects.length)
}

export function getVisibleProjects(state, user) {
  if (!user) return []
  if (user.role === ROLES.SUPER_ADMIN) return state.projects
  const projectIds = getAccessibleProjectIds(state, user)
  return state.projects.filter((project) => projectIds.has(project.id))
}

export function getVisibleTasks(state, user) {
  if (!user) return []
  if (user.role === ROLES.SUPER_ADMIN) return state.tasks
  if (user.role === ROLES.PROJECT_LEAD || user.role === ROLES.TEAM_LEADER) {
    const projectIds = getAccessibleProjectIds(state, user)
    return state.tasks.filter((task) => projectIds.has(task.projectId))
  }
  const projectIds = getUserTaskProjectIds(state, user.id)
  return state.tasks.filter(
    (task) =>
      projectIds.has(task.projectId) &&
      (task.assigneeId === user.id || task.qaId === user.id),
  )
}

export function getPersonalTasks(state, user) {
  if (!user) return []
  if (user.role === ROLES.DEVELOPER) {
    return state.tasks.filter((task) => task.assigneeId === user.id)
  }
  if (user.role === ROLES.QA_ENGINEER) {
    return state.tasks.filter((task) => task.qaId === user.id)
  }
  return getVisibleTasks(state, user)
}

export function isTaskOverdue(task) {
  return task.status !== TASK_STATUSES.COMPLETED && isOverdueDate(task.dueDate)
}

export function getOverdueTasks(tasks) {
  return tasks.filter(isTaskOverdue).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function getUpcomingTasks(tasks, days = 7) {
  return tasks
    .filter((task) => {
      if (task.status === TASK_STATUSES.COMPLETED) return false
      const remaining = daysUntil(task.dueDate)
      return remaining !== null && remaining >= 0 && remaining <= days
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function getProjectMembers(state, project) {
  if (!project) return []
  const memberIds = new Set(project.teamLeaderIds ?? [])
  getProjectTasks(state, project.id).forEach((task) => {
    if (task.assigneeId) memberIds.add(task.assigneeId)
    if (task.qaId) memberIds.add(task.qaId)
  })
  if (project.leadId) memberIds.add(project.leadId)
  return state.users.filter((user) => memberIds.has(user.id))
}

export function getProjectTeam(state, project) {
  if (!project) return []
  const memberIds = new Set()
  getProjectTasks(state, project.id).forEach((task) => {
    if (task.assigneeId) memberIds.add(task.assigneeId)
    if (task.qaId) memberIds.add(task.qaId)
  })
  return state.users.filter((user) => memberIds.has(user.id))
}

export function getWorkloadForUsers(state, users) {
  return users
    .map((user) => {
      const tasks = state.tasks.filter(
        (task) => task.assigneeId === user.id || task.qaId === user.id,
      )
      const open = tasks.filter((task) => task.status !== TASK_STATUSES.COMPLETED).length
      const completed = tasks.filter((task) => task.status === TASK_STATUSES.COMPLETED).length
      const overdue = tasks.filter(isTaskOverdue).length
      return { user, total: tasks.length, open, completed, overdue }
    })
    .sort((a, b) => b.open - a.open || a.user.name.localeCompare(b.user.name))
}

export function getUnreadNotifications(state, userId) {
  return state.notifications.filter(
    (notification) => notification.userId === userId && !notification.read,
  )
}

export function getUserNotifications(state, userId) {
  return state.notifications
    .filter((notification) => notification.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getVisibleActivities(state, user) {
  if (!user) return []
  const activities = [...state.activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  if (user.role === ROLES.SUPER_ADMIN) return activities
  if (user.role === ROLES.PROJECT_LEAD || user.role === ROLES.TEAM_LEADER) {
    const projectIds = getAccessibleProjectIds(state, user)
    return activities.filter(
      (activity) => activity.actorId === user.id || projectIds.has(activity.projectId),
    )
  }
  return activities.filter((activity) => activity.actorId === user.id)
}

export function getPortfolioStatusCounts(state) {
  return Object.values(PROJECT_STATUSES).map((status) => ({
    status,
    count: state.projects.filter((project) => project.status === status).length,
  }))
}

export function getVisibleBugs(state, user) {
  if (!user) return []
  if (user.role === ROLES.SUPER_ADMIN) return state.bugs
  if (user.role === ROLES.DEVELOPER) {
    return state.bugs.filter((bug) => bug.assignedTo === user.id)
  }
  if (user.role === ROLES.QA_ENGINEER) {
    return state.bugs.filter((bug) =>
      bug.reportedBy === user.id
      || bug.verifiedBy === user.id
      || state.tasks.some((task) => task.id === bug.taskId && task.qaId === user.id),
    )
  }
  const projectIds = getAccessibleProjectIds(state, user)
  return state.bugs.filter((bug) => projectIds.has(bug.projectId))
}

export function getQaVerificationQueue(state, user) {
  if (!user) return []
  return state.bugs.filter((bug) =>
    bug.status === 'fixed'
    && (bug.reportedBy === user.id
      || state.tasks.some((task) => task.id === bug.taskId && task.qaId === user.id)),
  )
}

export function getReportsForUser(state, user) {
  if (!user) return []
  if (user.role === ROLES.SUPER_ADMIN) {
    return [...state.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const projectIds = getAccessibleProjectIds(state, user)
  return state.reports
    .filter((report) => projectIds.has(report.projectId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getProjectHealth(state, project) {
  if (!project) return { progress: 0, overdue: 0, open: 0, total: 0 }
  const tasks = getProjectTasks(state, project.id)
  return {
    progress: getProjectProgress(state, project.id),
    overdue: tasks.filter(isTaskOverdue).length,
    open: tasks.filter((task) => task.status !== TASK_STATUSES.COMPLETED).length,
    total: tasks.length,
  }
}
