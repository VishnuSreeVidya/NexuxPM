import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePermission } from '../hooks/usePermission'

export function RequireAuth({ children }) {
  const { isAuthenticated, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        Verifying your session…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export function RequirePermission({ children, permission, roles }) {
  const { role, can } = usePermission()

  if (roles && !roles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  if (permission && !can(permission)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default RequireAuth
