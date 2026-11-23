import { DATA_KEY, SCHEMA_VERSION, SESSION_KEY } from '../utils/constants'
import { createSeedData } from './seedData'

const AUTH_TOKEN_KEY = 'nexuspm:auth:token:v1'
const AUTH_PROFILE_KEY = 'nexuspm:auth:profile:v1'

function sanitizeState(state) {
  if (!Array.isArray(state?.users)) return state
  return {
    ...state,
    users: state.users.map((user) => {
      if (!user || typeof user !== 'object') return user
      return Object.fromEntries(
        Object.entries(user).filter(([key]) => key !== 'password'),
      )
    }),
  }
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(DATA_KEY)
    if (!raw) return createSeedData()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return createSeedData()
    return sanitizeState(parsed)
  } catch (error) {
    console.warn('Unable to read saved demo data. A fresh dataset was created.', error)
    return createSeedData()
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(DATA_KEY, JSON.stringify(sanitizeState(state)))
  } catch (error) {
    console.warn('Unable to persist demo data to localStorage.', error)
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(DATA_KEY)
  } catch (error) {
    console.warn('Unable to clear saved demo data.', error)
  }
}

export function loadSession() {
  try {
    return window.localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function saveSession(userId) {
  try {
    window.localStorage.setItem(SESSION_KEY, userId)
  } catch (error) {
    console.warn('Unable to persist the demo session.', error)
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage access failures in restricted browser modes.
  }
}

export function loadAuth() {
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    const profileValue = window.localStorage.getItem(AUTH_PROFILE_KEY)
    if (!token && !profileValue) return null
    if (!token || !profileValue) {
      clearAuth()
      return null
    }

    const profile = JSON.parse(profileValue)
    if (!profile || typeof profile.id !== 'string') {
      clearAuth()
      return null
    }

    return { token, profile }
  } catch {
    clearAuth()
    return null
  }
}

export function saveAuth(token, profile) {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
    window.localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile))
    window.localStorage.removeItem(SESSION_KEY)
    return true
  } catch {
    console.warn('Unable to persist the authenticated session in localStorage.')
    return false
  }
}

export function clearAuth() {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    window.localStorage.removeItem(AUTH_PROFILE_KEY)
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage access failures in restricted browser modes.
  }
}
