// In production the API URL must be supplied at build time (GitHub Actions
// repository variable VITE_API_BASE_URL). A localhost fallback is used only for
// local `npm run dev`, never for the deployed GitHub Pages bundle.
const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')
export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getApiErrorMessage(error, fallback) {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Unable to reach the service. Check your connection and try again.'
    if (error.status === 401) return 'Your session expired. Please sign in again.'
    if (error.status === 403) return 'You do not have permission to make this change.'
    if ([404, 409, 422].includes(error.status)) return error.message
  }
  return fallback
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, 'Unable to reach the API service.')
  }

  const responseBody = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = responseBody?.detail
    throw new ApiError(
      response.status,
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).filter(Boolean).join(' ')
          : 'The service returned an unexpected response.',
    )
  }
  return responseBody
}

export function loginRequest(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getCurrentUser(token, signal) {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
}

export async function getProfilePhotoRequest(token, userId, signal) {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/users/${encodeURIComponent(userId)}/profile-photo`,
      {
        headers: {
          Accept: 'image/jpeg,image/png,image/webp',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
        signal,
      },
    )
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, 'Unable to reach the profile photo service.')
  }

  if (response.status === 404) return null
  if (!response.ok) {
    const responseBody = await response.json().catch(() => null)
    const detail = responseBody?.detail
    throw new ApiError(
      response.status,
      typeof detail === 'string' ? detail : 'The profile photo could not be loaded.',
    )
  }
  return response.blob()
}

export async function uploadProfilePhotoRequest(token, file, method) {
  const formData = new FormData()
  formData.append('file', file)

  let response
  try {
    response = await fetch(`${API_BASE_URL}/auth/me/profile-photo`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, 'Unable to reach the profile photo service.')
  }

  const responseBody = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = responseBody?.detail
    throw new ApiError(
      response.status,
      typeof detail === 'string' ? detail : 'The profile photo could not be saved.',
    )
  }
  return responseBody
}

export function removeProfilePhotoRequest(token) {
  return authenticatedRequest('/auth/me/profile-photo', token, {
    method: 'DELETE',
  })
}

export function switchRoleRequest(token, role) {
  return authenticatedRequest('/auth/switch-role', token, {
    method: 'POST',
    body: JSON.stringify({ role }),
  })
}

function authenticatedRequest(path, token, options = {}) {
  return request(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

export function normalizeProject(project) {
  return {
    id: project.id,
    name: project.name,
    code: project.code,
    description: project.description,
    status: project.status,
    priority: project.priority,
    startDate: project.startDate ?? project.start_date ?? null,
    endDate: project.endDate ?? project.end_date ?? null,
    leadId: project.leadId ?? project.lead_id,
    teamLeaderIds: project.teamLeaderIds ?? project.team_leader_ids ?? [],
    createdBy: project.createdBy ?? project.created_by,
    createdAt: project.createdAt ?? project.created_at,
    updatedAt: project.updatedAt ?? project.updated_at,
  }
}

export async function getProjects(token, signal) {
  const projects = await authenticatedRequest('/projects', token, { signal })
  return projects.map(normalizeProject)
}

export async function getProject(token, projectId, signal) {
  const project = await authenticatedRequest(
    `/projects/${encodeURIComponent(projectId)}`,
    token,
    { signal },
  )
  return normalizeProject(project)
}

export async function createProjectRequest(token, project) {
  const createdProject = await authenticatedRequest('/projects', token, {
    method: 'POST',
    body: JSON.stringify(project),
  })
  return normalizeProject(createdProject)
}

export async function updateProjectRequest(token, projectId, project) {
  const updatedProject = await authenticatedRequest(
    `/projects/${encodeURIComponent(projectId)}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify(project),
    },
  )
  return normalizeProject(updatedProject)
}

function taskRequest(path, token, options = {}) {
  return authenticatedRequest(path, token, options)
}

export function normalizeTask(task) {
  return {
    id: task.id,
    projectId: task.projectId ?? task.project_id,
    title: task.title,
    description: task.description,
    assigneeId: task.assigneeId ?? task.assignee_id,
    qaId: task.qaId ?? task.qa_id,
    priority: task.priority,
    status: task.status,
    startDate: task.startDate ?? task.start_date ?? null,
    dueDate: task.dueDate ?? task.due_date ?? null,
    progress: task.progress,
    createdBy: task.createdBy ?? task.created_by,
    createdAt: task.createdAt ?? task.created_at,
    updatedAt: task.updatedAt ?? task.updated_at,
    comments: (task.comments ?? []).map(normalizeTaskComment),
  }
}

export async function getTasks(token, signal) {
  const tasks = await taskRequest('/tasks', token, { signal })
  return tasks.map(normalizeTask)
}

export async function getTask(token, taskId, signal) {
  const task = await taskRequest(
    `/tasks/${encodeURIComponent(taskId)}`,
    token,
    { signal },
  )
  return normalizeTask(task)
}

export async function createTaskRequest(token, task) {
  const createdTask = await taskRequest('/tasks', token, {
    method: 'POST',
    body: JSON.stringify(task),
  })
  return normalizeTask(createdTask)
}

export async function updateTaskRequest(token, taskId, task) {
  const updatedTask = await taskRequest(
    `/tasks/${encodeURIComponent(taskId)}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify(task),
    },
  )
  return normalizeTask(updatedTask)
}

export async function transitionTaskRequest(token, taskId, status) {
  const updatedTask = await taskRequest(
    `/tasks/${encodeURIComponent(taskId)}/transition`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ status }),
    },
  )
  return normalizeTask(updatedTask)
}

export function normalizeTaskComment(comment) {
  const author = comment.author ?? {}
  return {
    id: comment.id,
    authorId: comment.authorId ?? comment.author_id ?? author.id,
    author: {
      id: author.id ?? comment.authorId ?? comment.author_id,
      name: author.name ?? '',
    },
    body: comment.body,
    createdAt: comment.createdAt ?? comment.created_at,
  }
}

export async function getTaskComments(token, taskId, signal) {
  const comments = await taskRequest(
    `/tasks/${encodeURIComponent(taskId)}/comments`,
    token,
    { signal },
  )
  return comments.map(normalizeTaskComment)
}

export async function createTaskCommentRequest(token, taskId, body) {
  const comment = await taskRequest(
    `/tasks/${encodeURIComponent(taskId)}/comments`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ body }),
    },
  )
  return normalizeTaskComment(comment)
}

export function normalizeBug(bug) {
  return {
    id: bug.id,
    title: bug.title,
    description: bug.description,
    projectId: bug.projectId ?? bug.project_id,
    taskId: bug.taskId ?? bug.task_id,
    severity: bug.severity,
    status: bug.status,
    reportedBy: bug.reportedBy ?? bug.reported_by,
    assignedTo: bug.assignedTo ?? bug.assigned_to,
    verifiedBy: bug.verifiedBy ?? bug.verified_by,
    createdAt: bug.createdAt ?? bug.created_at,
    updatedAt: bug.updatedAt ?? bug.updated_at,
  }
}

export async function getBugs(token, signal) {
  const bugs = await authenticatedRequest('/bugs', token, { signal })
  return bugs.map(normalizeBug)
}

export async function createBugRequest(token, bug) {
  const createdBug = await authenticatedRequest('/bugs', token, {
    method: 'POST',
    body: JSON.stringify(bug),
  })
  return normalizeBug(createdBug)
}

export async function updateBugRequest(token, bugId, status) {
  const updatedBug = await authenticatedRequest(
    `/bugs/${encodeURIComponent(bugId)}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ status }),
    },
  )
  return normalizeBug(updatedBug)
}

function normalizeActivity(activity) {
  return {
    id: activity.id,
    actorId: activity.actorId ?? activity.actor_id,
    actorName: activity.actorName ?? activity.actor_name,
    actorAvatarColor: activity.actorAvatarColor ?? activity.actor_avatar_color ?? null,
    projectId: activity.projectId ?? activity.project_id ?? null,
    projectName: activity.projectName ?? activity.project_name ?? null,
    description: activity.description,
    timestamp: activity.timestamp,
  }
}

export async function getActivity(token, { limit = 50, offset = 0, signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const activities = await authenticatedRequest(`/activity?${params}`, token, { signal })
  return activities.map(normalizeActivity)
}

function normalizeNotification(notification) {
  return {
    id: notification.id,
    userId: notification.userId ?? notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    read: notification.read,
    createdAt: notification.createdAt ?? notification.created_at,
  }
}

export async function getNotifications(token, { limit = 50, offset = 0, signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const notifications = await authenticatedRequest(`/notifications?${params}`, token, { signal })
  return notifications.map(normalizeNotification)
}

export async function getUnreadNotificationCount(token, signal) {
  const result = await authenticatedRequest('/notifications/unread-count', token, { signal })
  return result.unreadCount ?? result.unread_count ?? 0
}

export async function markNotificationReadRequest(token, notificationId) {
  const notification = await authenticatedRequest(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    token,
    { method: 'PUT' },
  )
  return normalizeNotification(notification)
}

export async function markAllNotificationsReadRequest(token) {
  const notifications = await authenticatedRequest('/notifications/read-all', token, {
    method: 'PUT',
  })
  return notifications.map(normalizeNotification)
}

export async function getAssignableUsers(token, role, projectId, signal) {
  const params = new URLSearchParams({ role })
  if (projectId) params.set('projectId', projectId)
  const users = await authenticatedRequest(`/users?${params}`, token, { signal })
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles ?? [],
  }))
}
