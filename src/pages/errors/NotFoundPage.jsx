import { Link, useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="state-page">
      <span className="state-page__code">404 · Not found</span>
      <span className="state-page__icon" aria-hidden="true">
        <Compass size={26} />
      </span>
      <h1 className="state-page__title">Page not found</h1>
      <p className="state-page__text">
        The page you are looking for does not exist in this demo workspace. It may have
        moved, or the link may be incomplete.
      </p>
      <div className="state-page__actions">
        <Link to="/dashboard" className="btn btn--primary">
          Return to dashboard
        </Link>
        <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    </div>
  )
}

export default NotFoundPage
