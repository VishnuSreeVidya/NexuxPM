import { Link, useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS } from '../../utils/constants'

export function UnauthorizedPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="state-page">
      <span className="state-page__code">403 · Forbidden</span>
      <span className="state-page__icon state-page__icon--warning" aria-hidden="true">
        <ShieldAlert size={26} />
      </span>
      <h1 className="state-page__title">Access restricted</h1>
      <p className="state-page__text">
        {currentUser
          ? `Your ${ROLE_LABELS[currentUser.role]} role does not include access to this area. Return to your dashboard to continue with the workflow available to you.`
          : 'This area is restricted for your current demo role.'}
      </p>
      <div className="state-page__actions">
        <Link to="/dashboard" className="btn btn--primary">
          Go to dashboard
        </Link>
        <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    </div>
  )
}

export default UnauthorizedPage
