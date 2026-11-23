import { createContext, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createSeedData } from '../services/seedData'
import {
  ApiError,
  getActivity,
  getAssignableUsers,
  getBugs,
  getNotifications,
  getProjects,
  getTasks,
  getUnreadNotificationCount,
} from '../services/api'
import { loadState, saveState } from '../services/storage'
import { rootReducer } from '../reducers/rootReducer'

export const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, undefined, loadState)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const projectsRequestId = useRef(0)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState('')
  const tasksRequestId = useRef(0)
  const [bugsLoading, setBugsLoading] = useState(false)
  const [bugsError, setBugsError] = useState('')
  const bugsRequestId = useRef(0)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')
  const activityRequestId = useRef(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const notificationsRequestId = useRef(0)
  const [assignableUsers, setAssignableUsers] = useState({})
  const assignableUserRequestIds = useRef({})

  useEffect(() => {
    saveState(state)
  }, [state])

  const updateUserProfile = useCallback((userId, patch) => {
    dispatch({ type: 'user/update', payload: { userId, patch } })
  }, [])

  const resetDemoData = useCallback(() => {
    const seedData = createSeedData()
    dispatch({
      type: 'data/reset',
      payload: {
        ...seedData,
        projects: state.projects,
        tasks: state.tasks,
        bugs: state.bugs,
      },
    })
  }, [state.projects, state.tasks, state.bugs])

  const refreshProjects = useCallback(async (token, signal) => {
    const requestId = projectsRequestId.current + 1
    projectsRequestId.current = requestId
    setProjectsLoading(true)
    setProjectsError('')
    dispatch({ type: 'projects/replace', payload: [] })

    try {
      const projects = await getProjects(token, signal)
      if (projectsRequestId.current !== requestId) return { ok: false }
      dispatch({ type: 'projects/replace', payload: projects })
      return { ok: true }
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (projectsRequestId.current === requestId) {
        dispatch({ type: 'projects/replace', payload: [] })
        setProjectsError(
          error instanceof ApiError && error.status === 401
            ? 'Your session expired. Please sign in again.'
            : 'Projects could not be loaded. Check your connection and try again.',
        )
      }
      return { ok: false, error }
    } finally {
      if (projectsRequestId.current === requestId) setProjectsLoading(false)
    }
  }, [])

  const clearProjectsError = useCallback(() => setProjectsError(''), [])

  const refreshTasks = useCallback(async (token, signal) => {
    const requestId = tasksRequestId.current + 1
    tasksRequestId.current = requestId
    setTasksLoading(true)
    setTasksError('')
    dispatch({ type: 'tasks/replace', payload: [] })

    try {
      const tasks = await getTasks(token, signal)
      if (tasksRequestId.current !== requestId) return { ok: false }
      dispatch({ type: 'tasks/replace', payload: tasks })
      return { ok: true }
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (tasksRequestId.current === requestId) {
        dispatch({ type: 'tasks/replace', payload: [] })
        setTasksError(
          error instanceof ApiError && error.status === 401
            ? 'Your session expired. Please sign in again.'
            : 'Tasks could not be loaded. Check your connection and try again.',
        )
      }
      return { ok: false, error }
    } finally {
      if (tasksRequestId.current === requestId) setTasksLoading(false)
    }
  }, [])

  const clearTasksError = useCallback(() => setTasksError(''), [])

  const refreshBugs = useCallback(async (token, signal) => {
    const requestId = bugsRequestId.current + 1
    bugsRequestId.current = requestId
    setBugsLoading(true)
    setBugsError('')
    dispatch({ type: 'bugs/replace', payload: [] })

    try {
      const bugs = await getBugs(token, signal)
      if (bugsRequestId.current !== requestId) return { ok: false }
      dispatch({ type: 'bugs/replace', payload: bugs })
      return { ok: true }
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (bugsRequestId.current === requestId) {
        dispatch({ type: 'bugs/replace', payload: [] })
        setBugsError(
          error instanceof ApiError && error.status === 401
            ? 'Your session expired. Please sign in again.'
            : error instanceof ApiError && error.status === 403
              ? 'You do not have permission to view bugs.'
              : 'Bugs could not be loaded. Check your connection and try again.',
        )
      }
      return { ok: false, error }
    } finally {
      if (bugsRequestId.current === requestId) setBugsLoading(false)
    }
  }, [])

  const clearBugsError = useCallback(() => setBugsError(''), [])

  const refreshActivity = useCallback(async (token, signal) => {
    const requestId = activityRequestId.current + 1
    activityRequestId.current = requestId
    setActivityLoading(true)
    setActivityError('')
    try {
      const activities = await getActivity(token, { signal })
      if (activityRequestId.current !== requestId) return { ok: false }
      dispatch({ type: 'activity/replace', payload: activities })
      return { ok: true }
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (activityRequestId.current === requestId) {
        dispatch({ type: 'activity/replace', payload: [] })
        setActivityError(
          error instanceof ApiError && error.status === 401
            ? 'Your session expired. Please sign in again.'
            : 'Activity could not be loaded. Check your connection and try again.',
        )
      }
      return { ok: false, error }
    } finally {
      if (activityRequestId.current === requestId) setActivityLoading(false)
    }
  }, [dispatch])

  const clearActivityError = useCallback(() => setActivityError(''), [])

  const refreshNotifications = useCallback(async (token, signal) => {
    const requestId = notificationsRequestId.current + 1
    notificationsRequestId.current = requestId
    setNotificationsLoading(true)
    setNotificationsError('')
    try {
      const [notifications, unreadCount] = await Promise.all([
        getNotifications(token, { signal }),
        getUnreadNotificationCount(token, signal),
      ])
      if (notificationsRequestId.current !== requestId) return { ok: false }
      dispatch({ type: 'notifications/replace', payload: notifications })
      setUnreadNotificationCount(unreadCount)
      return { ok: true }
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (notificationsRequestId.current === requestId) {
        dispatch({ type: 'notifications/replace', payload: [] })
        setUnreadNotificationCount(0)
        setNotificationsError(
          error instanceof ApiError && error.status === 401
            ? 'Your session expired. Please sign in again.'
            : 'Notifications could not be loaded. Check your connection and try again.',
        )
      }
      return { ok: false, error }
    } finally {
      if (notificationsRequestId.current === requestId) setNotificationsLoading(false)
    }
  }, [dispatch])

  const clearNotificationsError = useCallback(() => setNotificationsError(''), [])

  const refreshAssignableUsers = useCallback(async (token, role, projectId, signal) => {
    const key = `${role}:${projectId ?? ''}`
    const requestId = (assignableUserRequestIds.current[key] ?? 0) + 1
    assignableUserRequestIds.current[key] = requestId
    setAssignableUsers((current) => ({
      ...current,
      [key]: { users: current[key]?.users ?? [], loading: true, error: '' },
    }))
    try {
      const users = await getAssignableUsers(token, role, projectId, signal)
      if (assignableUserRequestIds.current[key] !== requestId) return { ok: false }
      setAssignableUsers((current) => ({
        ...current,
        [key]: { users, loading: false, error: '' },
      }))
      return { ok: true, users }
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (assignableUserRequestIds.current[key] === requestId) {
        setAssignableUsers((current) => ({
          ...current,
          [key]: {
            users: [],
            loading: false,
            error: error instanceof ApiError && error.status === 401
              ? 'Your session expired. Please sign in again.'
              : error instanceof ApiError && error.status === 403
                ? 'You do not have permission to load employees for this assignment.'
                : 'Employees could not be loaded. Check your connection and try again.',
          },
        }))
      }
      return { ok: false, error }
    }
  }, [])

  const getAssignableUserState = useCallback(
    (role, projectId) => assignableUsers[`${role}:${projectId ?? ''}`] ?? {
      users: [],
      loading: false,
      error: '',
    },
    [assignableUsers],
  )

  const value = useMemo(
    () => ({
      state,
      dispatch,
      projectsLoading,
      projectsError,
      tasksLoading,
      tasksError,
      bugsLoading,
      bugsError,
      activityLoading,
      activityError,
      notificationsLoading,
      notificationsError,
      unreadNotificationCount,
      refreshProjects,
      refreshTasks,
      refreshBugs,
      refreshActivity,
      refreshNotifications,
      refreshAssignableUsers,
      getAssignableUserState,
      clearProjectsError,
      clearTasksError,
      clearBugsError,
      clearActivityError,
      clearNotificationsError,
      updateUserProfile,
      resetDemoData,
    }),
    [
      state,
      projectsLoading,
      projectsError,
      tasksLoading,
      tasksError,
      bugsLoading,
      bugsError,
      activityLoading,
      activityError,
      notificationsLoading,
      notificationsError,
      unreadNotificationCount,
      refreshProjects,
      refreshTasks,
      refreshBugs,
      refreshActivity,
      refreshNotifications,
      refreshAssignableUsers,
      getAssignableUserState,
      clearProjectsError,
      clearTasksError,
      clearBugsError,
      clearActivityError,
      clearNotificationsError,
      updateUserProfile,
      resetDemoData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export default DataProvider
