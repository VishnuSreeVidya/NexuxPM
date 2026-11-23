import { TASK_STATUSES } from '../utils/constants'

function recordActivity(state, actorId, projectId, description) {
  const timestamp = new Date().toISOString()
  const activity = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actorId,
    projectId,
    description,
    timestamp,
    createdAt: timestamp,
  }
  return { ...state, activities: [activity, ...state.activities] }
}

function notifyUsers(state, userIds, type, title, message, link) {
  const notifications = userIds.filter(Boolean).map((userId, index) => ({
    id: `ntf-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
    userId,
    type,
    title,
    message,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  }))
  return { ...state, notifications: [...notifications, ...state.notifications] }
}

function projectTeam(state, project) {
  if (!project) return []
  const tasks = state.tasks.filter((task) => task.projectId === project.id)
  return [...new Set([
    project.leadId,
    ...(project.teamLeaderIds ?? []),
    ...tasks.flatMap((task) => [task.assigneeId, task.qaId]),
  ])].filter(Boolean)
}

export function rootReducer(state, action) {
  switch (action.type) {
    case 'projects/replace':
      return { ...state, projects: action.payload }

    case 'tasks/replace':
      return { ...state, tasks: action.payload }

    case 'bugs/replace':
      return { ...state, bugs: action.payload }

    case 'activity/replace':
      return { ...state, activities: action.payload }

    case 'notifications/replace':
      return { ...state, notifications: action.payload }

    case 'notification/server-upsert': {
      const exists = state.notifications.some(
        (notification) => notification.id === action.payload.id,
      )
      return {
        ...state,
        notifications: exists
          ? state.notifications.map((notification) => (
            notification.id === action.payload.id ? action.payload : notification
          ))
          : [action.payload, ...state.notifications],
      }
    }

    case 'task/comment-add': {
      const task = state.tasks.find((item) => item.id === action.payload.taskId)
      if (!task) return state
      return {
        ...state,
        tasks: state.tasks.map((item) => (
          item.id === action.payload.taskId
            ? {
              ...item,
              comments: [...(item.comments ?? []), action.payload.comment],
            }
            : item
        )),
      }
    }

    case 'bug/server-upsert': {
      const exists = state.bugs.some((bug) => bug.id === action.payload.id)
      return {
        ...state,
        bugs: exists
          ? state.bugs.map((bug) => (
            bug.id === action.payload.id ? action.payload : bug
          ))
          : [action.payload, ...state.bugs],
      }
    }

    case 'task/server-upsert': {
      const exists = state.tasks.some((task) => task.id === action.payload.id)
      return {
        ...state,
        tasks: exists
          ? state.tasks.map((task) => (
            task.id === action.payload.id ? action.payload : task
          ))
          : [action.payload, ...state.tasks],
      }
    }

    case 'project/server-upsert': {
      const exists = state.projects.some((project) => project.id === action.payload.id)
      return {
        ...state,
        projects: exists
          ? state.projects.map((project) => (
            project.id === action.payload.id ? action.payload : project
          ))
          : [action.payload, ...state.projects],
      }
    }

    case 'project/create': {
      const { project, actorId } = action.payload
      const next = recordActivity(
        { ...state, projects: [project, ...state.projects] },
        actorId,
        project.id,
        `created project “${project.name}”.`,
      )
      return notifyUsers(next, [project.leadId], 'project', 'Project assigned', project.name, '/projects')
    }

    case 'project/update': {
      const { projectId, patch, actorId, description } = action.payload
      const project = state.projects.find((item) => item.id === projectId)
      if (!project) return state
      const updatedProject = { ...project, ...patch, updatedAt: new Date().toISOString() }
      let next = {
        ...state,
        projects: state.projects.map((item) => item.id === projectId ? updatedProject : item),
      }
      next = recordActivity(
        next,
        actorId,
        projectId,
        description ?? `updated project “${project.name}”.`,
      )
      const recipients = projectTeam(state, updatedProject).filter((id) => id !== actorId)
      return notifyUsers(next, recipients, 'project', 'Project updated', `${project.name} was updated.`, '/projects')
    }

    case 'task/create': {
      const { task, actorId } = action.payload
      const project = state.projects.find((item) => item.id === task.projectId)
      if (!project) return state
      let next = recordActivity(
        { ...state, tasks: [task, ...state.tasks] },
        actorId,
        task.projectId,
        `created task “${task.title}” and assigned the delivery team.`,
      )
      const recipients = [...new Set([task.assigneeId, task.qaId, project.leadId, ...project.teamLeaderIds])]
        .filter((id) => id && id !== actorId)
      return notifyUsers(next, recipients, 'task', 'New task assigned', task.title, '/tasks')
    }

    case 'task/update': {
      const { taskId, patch, actorId, description, notifyIds = [] } = action.payload
      const task = state.tasks.find((item) => item.id === taskId)
      if (!task) return state
      const updatedTask = { ...task, ...patch, updatedAt: new Date().toISOString() }
      let next = {
        ...state,
        tasks: state.tasks.map((item) => item.id === taskId ? updatedTask : item),
      }
      next = recordActivity(
        next,
        actorId,
        task.projectId,
        description ?? `updated “${task.title}”.`,
      )
      return notifyUsers(
        next,
        [...new Set(notifyIds)].filter((id) => id && id !== actorId),
        'task',
        'Task updated',
        description ?? task.title,
        '/tasks',
      )
    }

    case 'task/transition': {
      const { taskId, status, actorId, description } = action.payload
      const task = state.tasks.find((item) => item.id === taskId)
      if (!task) return state
      const progress = status === TASK_STATUSES.COMPLETED
        ? 100
        : status === TASK_STATUSES.IN_PROGRESS
          ? Math.max(task.progress, 10)
          : status === TASK_STATUSES.IN_REVIEW || status === TASK_STATUSES.TESTING
            ? Math.max(task.progress, 90)
            : task.progress
      const project = state.projects.find((item) => item.id === task.projectId)
      const recipients = [task.assigneeId, task.qaId, project?.leadId, ...(project?.teamLeaderIds ?? [])]
      return rootReducer(state, {
        type: 'task/update',
        payload: {
          taskId,
          actorId,
          patch: { status, progress },
          notifyIds: recipients,
          description: description ?? `moved “${task.title}” to ${status.replace('_', ' ')}.`,
        },
      })
    }

    case 'notification/read':
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.payload ? { ...notification, read: true } : notification,
        ),
      }

    case 'notification/read-all':
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.userId === action.payload ? { ...notification, read: true } : notification,
        ),
      }

    case 'user/update':
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === action.payload.userId ? { ...user, ...action.payload.patch } : user,
        ),
      }

    case 'data/replace':
    case 'data/reset':
      return action.payload

    default:
      return state
  }
}
