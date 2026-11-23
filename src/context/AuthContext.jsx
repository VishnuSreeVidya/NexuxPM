import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useData } from '../hooks/useData'
import {
  ApiError,
  createBugRequest,
  createProjectRequest,
  createTaskCommentRequest,
  createTaskRequest,
  getCurrentUser,
  getProfilePhotoRequest,
  getProject as getProjectRequest,
  getTask as getTaskRequest,
  getTaskComments as getTaskCommentsRequest,
  loginRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
  removeProfilePhotoRequest,
  switchRoleRequest,
  transitionTaskRequest,
  uploadProfilePhotoRequest,
  updateBugRequest,
  updateTaskRequest,
  updateProjectRequest,
} from '../services/api'
import { clearAuth, loadAuth, saveAuth } from '../services/storage'

export const AuthContext = createContext(null)

function toSafeProfile(user) {
  const activeRole = user.activeRole ?? user.active_role ?? user.role
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: activeRole,
    activeRole,
    roles: user.roles ?? [activeRole],
    department: user.department,
    title: user.title,
    avatarColor: user.avatar_color ?? user.avatarColor ?? null,
    profileImageAvailable: user.profileImageAvailable ?? user.profile_image_available ?? false,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
    joinedAt: user.joined_at ?? user.joinedAt ?? null,
    lastLoginAt: user.last_login_at ?? user.lastLoginAt ?? null,
  }
}

function getUserForWorkspace(profile, localUser) {
  if (!profile) return null
  return {
    ...profile,
    name: localUser?.name ?? profile.name,
    title: localUser?.title ?? profile.title,
    avatarColor: localUser?.avatarColor ?? profile.avatarColor,
    profileImageAvailable: profile.profileImageAvailable,
    profilePhotoVersion: profile.profilePhotoVersion,
    phone: localUser?.phone ?? profile.phone,
    location: localUser?.location ?? profile.location,
    bio: localUser?.bio ?? profile.bio,
    joinedAt: localUser?.joinedAt ?? profile.joinedAt,
    lastLoginAt: profile.lastLoginAt,
  }
}

function getLoginError(error) {
  if (error instanceof ApiError && error.status === 401) {
    return 'Email or password is incorrect.'
  }
  if (error instanceof ApiError && error.status === 422) {
    return 'Enter a valid email address and password.'
  }
  if (error instanceof ApiError && error.status === 0) {
    return 'Unable to reach the sign-in service. Check your connection and try again.'
  }
  return 'Sign-in is temporarily unavailable. Please try again.'
}

export function AuthProvider({ children }) {
  const {
    state,
    dispatch,
    refreshProjects,
    refreshTasks,
    refreshBugs,
    refreshActivity,
    refreshNotifications,
    refreshAssignableUsers,
  } = useData()
  const [initialAuth] = useState(loadAuth)
  const [auth, setAuth] = useState(initialAuth)
  const [isVerified, setIsVerified] = useState(false)
  const [authLoading, setAuthLoading] = useState(() => Boolean(initialAuth?.token))
  const [authError, setAuthError] = useState('')

  const invalidateSession = useCallback((message = 'Your session expired. Please sign in again.') => {
    clearAuth()
    setAuth(null)
    setIsVerified(false)
    setAuthLoading(false)
    setAuthError(message)
  }, [])

  useEffect(() => {
    const savedAuth = initialAuth
    if (!savedAuth?.token) return undefined

    const controller = new AbortController()
    async function restoreSession() {
      try {
        const user = await getCurrentUser(savedAuth.token, controller.signal)
        const [projectResult, taskResult, bugResult, activityResult, notificationResult] = await Promise.all([
          refreshProjects(savedAuth.token, controller.signal),
          refreshTasks(savedAuth.token, controller.signal),
          refreshBugs(savedAuth.token, controller.signal),
          refreshActivity(savedAuth.token, controller.signal),
          refreshNotifications(savedAuth.token, controller.signal),
        ])
        if (controller.signal.aborted) return
        if ([projectResult, taskResult, bugResult, activityResult, notificationResult].some(
          (result) => result.error instanceof ApiError && result.error.status === 401,
        )) {
          invalidateSession()
          return
        }
        const profile = toSafeProfile(user)
        saveAuth(savedAuth.token, profile)
        setAuth({ token: savedAuth.token, profile })
        setIsVerified(true)
        setAuthError('')
      } catch (error) {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) {
          invalidateSession()
          return
        }
        setAuthError(
          'Unable to verify your saved session. Check your connection, then sign in again.',
        )
      } finally {
        if (!controller.signal.aborted) setAuthLoading(false)
      }
    }

    restoreSession()

    return () => controller.abort()
  }, [
    initialAuth,
    invalidateSession,
    refreshProjects,
    refreshTasks,
    refreshBugs,
    refreshActivity,
    refreshNotifications,
  ])

  const localUser = useMemo(
    () => state.users.find((user) => user.id === auth?.profile?.id),
    [state.users, auth?.profile?.id],
  )
  const currentUser = useMemo(
    () => getUserForWorkspace(auth?.profile, localUser),
    [auth?.profile, localUser],
  )

  const refreshWorkspaceFeeds = useCallback(async (token, signal) => {
    const results = await Promise.all([
      refreshActivity(token, signal),
      refreshNotifications(token, signal),
    ])
    if (results.some(
      (result) => result.error instanceof ApiError && result.error.status === 401,
    )) {
      invalidateSession()
    }
    return results
  }, [invalidateSession, refreshActivity, refreshNotifications])

  const login = useCallback(async (email, password) => {
    setAuthError('')
    try {
      const response = await loginRequest(email, password)
      const profile = toSafeProfile(response.user)
      const saved = saveAuth(response.access_token, profile)
      const [projectResult, taskResult, bugResult, activityResult, notificationResult] = await Promise.all([
        refreshProjects(response.access_token),
        refreshTasks(response.access_token),
        refreshBugs(response.access_token),
        refreshActivity(response.access_token),
        refreshNotifications(response.access_token),
      ])
      if ([projectResult, taskResult, bugResult, activityResult, notificationResult].some(
        (result) => result.error instanceof ApiError && result.error.status === 401,
      )) {
        invalidateSession()
        return { ok: false, error: 'Your session could not be verified. Please sign in again.' }
      }
      setAuth({ token: response.access_token, profile })
      setIsVerified(true)
      setAuthLoading(false)
      return {
        ok: true,
        user: profile,
        warning: saved
          ? null
          : 'Signed in, but this browser could not save your session for the next visit.',
      }
    } catch (error) {
      const message = getLoginError(error)
      return { ok: false, error: message }
    }
  }, [
    invalidateSession,
    refreshProjects,
    refreshTasks,
    refreshBugs,
    refreshActivity,
    refreshNotifications,
  ])

  const switchRole = useCallback(async (role) => {
    if (!auth?.token || !currentUser) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    if (!currentUser.roles?.includes(role)) {
      throw new ApiError(403, 'That role is not assigned to your account.')
    }
    try {
      const response = await switchRoleRequest(auth.token, role)
      const profile = toSafeProfile(response.user)
      const saved = saveAuth(response.access_token, profile)
      setAuth({ token: response.access_token, profile })
      setIsVerified(true)
      const refreshResults = await Promise.all([
        refreshProjects(response.access_token),
        refreshTasks(response.access_token),
        refreshBugs(response.access_token),
        refreshActivity(response.access_token),
        refreshNotifications(response.access_token),
      ])
      if (refreshResults.some(
        (result) => result.error instanceof ApiError && result.error.status === 401,
      )) {
        invalidateSession()
        throw new ApiError(401, 'Your session expired. Please sign in again.')
      }
      return {
        ok: true,
        user: profile,
        warning: saved
          ? null
          : 'Role changed, but this browser could not save the session for the next visit.',
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [
    auth,
    currentUser,
    invalidateSession,
    refreshBugs,
    refreshActivity,
    refreshNotifications,
    refreshProjects,
    refreshTasks,
  ])

  const reloadProjects = useCallback(async () => {
    if (!auth?.token) {
      invalidateSession()
      return { ok: false }
    }
    const result = await refreshProjects(auth.token)
    if (result.error instanceof ApiError && result.error.status === 401) {
      invalidateSession()
    }
    return result
  }, [auth, invalidateSession, refreshProjects])

  const createProject = useCallback(async (projectData) => {
    if (!auth?.token || !currentUser) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const project = await createProjectRequest(auth.token, projectData)
      dispatch({ type: 'project/server-upsert', payload: project })
      await refreshWorkspaceFeeds(auth.token)
      return project
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, currentUser, dispatch, invalidateSession, refreshWorkspaceFeeds])

  const updateProject = useCallback(async (projectId, projectData) => {
    if (!auth?.token || !currentUser) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const project = await updateProjectRequest(auth.token, projectId, projectData)
      dispatch({ type: 'project/server-upsert', payload: project })
      await refreshWorkspaceFeeds(auth.token)
      return project
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, currentUser, dispatch, invalidateSession, refreshWorkspaceFeeds])

  const getProject = useCallback(async (projectId, signal) => {
    if (!auth?.token) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const project = await getProjectRequest(auth.token, projectId, signal)
      dispatch({ type: 'project/server-upsert', payload: project })
      return project
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, dispatch, invalidateSession])

  const reloadTasks = useCallback(async () => {
    if (!auth?.token) {
      invalidateSession()
      return { ok: false }
    }
    const result = await refreshTasks(auth.token)
    if (result.error instanceof ApiError && result.error.status === 401) {
      invalidateSession()
    }
    return result
  }, [auth, invalidateSession, refreshTasks])

  const reloadBugs = useCallback(async () => {
    if (!auth?.token) {
      invalidateSession()
      return { ok: false }
    }
    const result = await refreshBugs(auth.token)
    if (result.error instanceof ApiError && result.error.status === 401) {
      invalidateSession()
    }
    return result
  }, [auth, invalidateSession, refreshBugs])

  const reloadActivity = useCallback(async () => {
    if (!auth?.token) {
      invalidateSession()
      return { ok: false }
    }
    const result = await refreshActivity(auth.token)
    if (result.error instanceof ApiError && result.error.status === 401) {
      invalidateSession()
    }
    return result
  }, [auth, invalidateSession, refreshActivity])

  const reloadNotifications = useCallback(async () => {
    if (!auth?.token) {
      invalidateSession()
      return { ok: false }
    }
    const result = await refreshNotifications(auth.token)
    if (result.error instanceof ApiError && result.error.status === 401) {
      invalidateSession()
    }
    return result
  }, [auth, invalidateSession, refreshNotifications])

  const reloadAssignableUsers = useCallback(async (role, projectId, signal) => {
    if (!auth?.token) {
      invalidateSession()
      return { ok: false }
    }
    const result = await refreshAssignableUsers(auth.token, role, projectId, signal)
    if (result.error instanceof ApiError && result.error.status === 401) {
      invalidateSession()
    }
    return result
  }, [auth, invalidateSession, refreshAssignableUsers])

  const markNotificationRead = useCallback(async (notificationId) => {
    if (!auth?.token) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const notification = await markNotificationReadRequest(auth.token, notificationId)
      await refreshNotifications(auth.token)
      return notification
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, invalidateSession, refreshNotifications])

  const markAllNotificationsRead = useCallback(async () => {
    if (!auth?.token) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const notifications = await markAllNotificationsReadRequest(auth.token)
      await refreshNotifications(auth.token)
      return notifications
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, invalidateSession, refreshNotifications])

  const getTask = useCallback(async (taskId, signal) => {
    if (!auth?.token) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const task = await getTaskRequest(auth.token, taskId, signal)
      dispatch({ type: 'task/server-upsert', payload: task })
      return task
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, dispatch, invalidateSession])

  const createTask = useCallback(async (taskData) => {
    if (!auth?.token || !currentUser) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const task = await createTaskRequest(auth.token, taskData)
      dispatch({ type: 'task/server-upsert', payload: task })
      await refreshWorkspaceFeeds(auth.token)
      return task
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, currentUser, dispatch, invalidateSession, refreshWorkspaceFeeds])

  const updateTask = useCallback(async (taskId, taskData) => {
    if (!auth?.token || !currentUser) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const task = await updateTaskRequest(auth.token, taskId, taskData)
      dispatch({ type: 'task/server-upsert', payload: task })
      await refreshWorkspaceFeeds(auth.token)
      return task
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, currentUser, dispatch, invalidateSession, refreshWorkspaceFeeds])

  const transitionTask = useCallback(async (taskId, status) => {
    if (!auth?.token || !currentUser) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const task = await transitionTaskRequest(auth.token, taskId, status)
      dispatch({ type: 'task/server-upsert', payload: task })
      await refreshWorkspaceFeeds(auth.token)
      return task
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, currentUser, dispatch, invalidateSession, refreshWorkspaceFeeds])

  const createBug = useCallback(async (bugData) => {
    if (!auth?.token || !currentUser) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const bug = await createBugRequest(auth.token, bugData)
      dispatch({ type: 'bug/server-upsert', payload: bug })
      const taskResult = await refreshTasks(auth.token)
      await refreshWorkspaceFeeds(auth.token)
      if (taskResult.error instanceof ApiError && taskResult.error.status === 401) {
        invalidateSession()
      }
      return bug
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, currentUser, dispatch, invalidateSession, refreshTasks, refreshWorkspaceFeeds])

  const updateBug = useCallback(async (bugId, status) => {
    if (!auth?.token || !currentUser) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const bug = await updateBugRequest(auth.token, bugId, status)
      dispatch({ type: 'bug/server-upsert', payload: bug })
      await refreshWorkspaceFeeds(auth.token)
      return bug
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, currentUser, dispatch, invalidateSession, refreshWorkspaceFeeds])

  const getTaskComments = useCallback(async (taskId, signal) => {
    if (!auth?.token) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      return await getTaskCommentsRequest(auth.token, taskId, signal)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, invalidateSession])

  const createTaskComment = useCallback(async (taskId, body) => {
    if (!auth?.token) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      return await createTaskCommentRequest(auth.token, taskId, body)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, invalidateSession])

  const clearAuthError = useCallback(() => setAuthError(''), [])

  const getProfilePhoto = useCallback(async (userId, signal) => {
    if (!auth?.token) return null
    try {
      return await getProfilePhotoRequest(auth.token, userId, signal)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, invalidateSession])

  const uploadProfilePhoto = useCallback(async (file) => {
    if (!auth?.token || !auth.profile) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const method = auth.profile.profileImageAvailable ? 'PUT' : 'POST'
      const result = await uploadProfilePhotoRequest(auth.token, file, method)
      const profile = {
        ...auth.profile,
        profileImageAvailable: true,
        profilePhotoVersion: Date.now(),
      }
      saveAuth(auth.token, profile)
      setAuth({ token: auth.token, profile })
      return result
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, invalidateSession])

  const removeProfilePhoto = useCallback(async () => {
    if (!auth?.token || !auth.profile) {
      invalidateSession()
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    try {
      const result = await removeProfilePhotoRequest(auth.token)
      const profile = {
        ...auth.profile,
        profileImageAvailable: false,
        profilePhotoVersion: Date.now(),
      }
      saveAuth(auth.token, profile)
      setAuth({ token: auth.token, profile })
      return result
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) invalidateSession()
      throw error
    }
  }, [auth, invalidateSession])

  const logout = useCallback(() => {
    clearAuth()
    setAuth(null)
    setIsVerified(false)
    setAuthLoading(false)
    setAuthError('')
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      getProfilePhoto,
      isAuthenticated: isVerified && Boolean(currentUser),
      authLoading,
      authError,
      login,
      switchRole,
      logout,
      clearAuthError,
      reloadProjects,
      reloadTasks,
      reloadBugs,
      reloadActivity,
      reloadNotifications,
      reloadAssignableUsers,
      markNotificationRead,
      markAllNotificationsRead,
      createProject,
      updateProject,
      getProject,
      getTask,
      getTaskComments,
      createTaskComment,
      createTask,
      updateTask,
      transitionTask,
      createBug,
      updateBug,
      uploadProfilePhoto,
      removeProfilePhoto,
    }),
    [
      currentUser,
      getProfilePhoto,
      isVerified,
      authLoading,
      authError,
      login,
      switchRole,
      logout,
      clearAuthError,
      reloadProjects,
      reloadTasks,
      reloadBugs,
      reloadActivity,
      reloadNotifications,
      reloadAssignableUsers,
      markNotificationRead,
      markAllNotificationsRead,
      createProject,
      updateProject,
      getProject,
      getTask,
      getTaskComments,
      createTaskComment,
      createTask,
      updateTask,
      transitionTask,
      createBug,
      updateBug,
      uploadProfilePhoto,
      removeProfilePhoto,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
