import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderKanban,
  Layers,
  ListChecks,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { Avatar } from '../../components/common/Avatar'
import { Button } from '../../components/common/Button'
import { ROLES, ROLE_LABELS } from '../../utils/constants'

const DEMO_ROLE_ORDER = [
  ROLES.SUPER_ADMIN,
  ROLES.PROJECT_LEAD,
  ROLES.TEAM_LEADER,
  ROLES.DEVELOPER,
  ROLES.QA_ENGINEER,
]

const ROLE_SHORT_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Admin',
  [ROLES.PROJECT_LEAD]: 'Lead',
  [ROLES.TEAM_LEADER]: 'Team',
  [ROLES.DEVELOPER]: 'Dev',
  [ROLES.QA_ENGINEER]: 'QA',
}

export function LoginPage() {
  const { state } = useData()
  const { isAuthenticated, authLoading, authError, clearAuthError, login } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const demoAccounts = DEMO_ROLE_ORDER.map((role) =>
    state.users.find((user) => user.role === role),
  ).filter(Boolean)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  if (authLoading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        Verifying your session…
      </div>
    )
  }

  const redirectTo = location.state?.from?.pathname ?? '/dashboard'

  function selectDemoAccount(account) {
    setEmail(account.email)
    setPassword('')
    setSelectedRole(account.role)
    setError('')
    clearAuthError()
  }

  function handleEmailChange(value) {
    setEmail(value)
    setError('')
    clearAuthError()
    const match = state.users.find(
      (user) => user.email.toLowerCase() === value.trim().toLowerCase(),
    )
    setSelectedRole(match?.role ?? null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const result = await login(email, password)
      if (!result.ok) {
        setError(result.error)
        return
      }

      const firstName = result.user.name.split(' ')[0]
      notify(`Welcome back, ${firstName}. Your ${ROLE_LABELS[result.user.role]} workspace is ready.`, {
        type: 'success',
        title: 'Signed in successfully',
      })
      if (result.warning) {
        notify(result.warning, { type: 'info', title: 'Session not saved' })
      }
      navigate(redirectTo, { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="login-brand__content">
          <div className="login-brand__brand-row">
            <span className="login-brand__logo" aria-hidden="true">
              <Layers size={22} />
            </span>
            <div>
              <div className="login-brand__product">NexusPM</div>
              <div className="login-brand__tagline">Project delivery workspace</div>
            </div>
          </div>

          <div>
            <h1 className="login-brand__headline">
              Ship projects with clarity, <span>accountability</span>, and quality.
            </h1>
            <p className="login-brand__copy">
              A role-based project management workspace built around one clear workflow:
              leadership sets the direction, team leaders coordinate delivery, developers
              build, and QA protects the quality gate.
            </p>
          </div>

          <div className="login-brand__points">
            <div className="login-brand__point">
              <span className="login-brand__point-icon" aria-hidden="true">
                <FolderKanban size={13} />
              </span>
              <span>Super Admins create projects and assign Project Leads.</span>
            </div>
            <div className="login-brand__point">
              <span className="login-brand__point-icon" aria-hidden="true">
                <ListChecks size={13} />
              </span>
              <span>Team Leaders create tasks and assign the delivery team.</span>
            </div>
            <div className="login-brand__point">
              <span className="login-brand__point-icon" aria-hidden="true">
                <CheckCircle2 size={13} />
              </span>
              <span>QA verifies the work before a task can be completed.</span>
            </div>
          </div>

          <div className="login-preview" aria-hidden="true">
            <div className="login-preview__head">
              <span className="login-preview__title">Website Redesign · WEB-24</span>
              <span className="login-preview__pill">On track</span>
            </div>
            <div className="login-preview__row">
              <FolderKanban size={13} />
              <span>Production ready build</span>
              <strong>67%</strong>
            </div>
            <div className="login-preview__bar">
              <span style={{ width: '67%' }} />
            </div>
            <div className="login-preview__row">
              <CheckCircle2 size={13} />
              <span>QA verification queue</span>
              <strong>3 items</strong>
            </div>
          </div>
        </div>

        <footer className="login-brand__footer">
          <span>
            Demo workspace · <strong>Backend-enforced RBAC</strong>
          </span>
          <span>Phase 1 · Role foundations</span>
        </footer>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <header className="login-card__header">
            <div className="page-header__eyebrow">
              <Sparkles size={12} aria-hidden="true" />
              Demo access
            </div>
            <h2 className="login-card__title">Sign in to your workspace</h2>
            <p className="login-card__subtitle">
              Choose a workspace role to fill its account email, or enter your account
              details manually.
            </p>
          </header>

          <div className="login-demo">
            <div className="login-demo__header">
              <span className="login-demo__title">Quick account selection</span>
              <span className="login-demo__hint">Select a role to fill its email</span>
            </div>
            <div className="login-accounts">
              {demoAccounts.map((account) => (
                <button
                  type="button"
                  key={account.id}
                  className={`login-account ${selectedRole === account.role ? 'is-selected' : ''}`.trim()}
                  onClick={() => selectDemoAccount(account)}
                  title={`${account.name} — ${ROLE_LABELS[account.role]}`}
                  aria-label={`Use ${ROLE_LABELS[account.role]} demo account for ${account.name}`}
                >
                  <Avatar name={account.name} color={account.avatarColor} size="sm" />
                  <span className="login-account__name">{account.name.split(' ')[0]}</span>
                  <span className="login-account__role">
                    {ROLE_SHORT_LABELS[account.role]}
                  </span>
                  {selectedRole === account.role ? (
                    <span className="login-account__check" aria-hidden="true">
                      <CheckCircle2 size={9} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {error || authError ? (
              <div className="login-error" role="alert">
                <AlertCircle size={15} aria-hidden="true" />
                <span>{error || authError}</span>
              </div>
            ) : null}

            <label className="form-field">
              <span className="form-label">Email address</span>
              <span className="input-group">
                <Mail size={15} aria-hidden="true" />
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => handleEmailChange(event.target.value)}
                  placeholder="you@nexuspm.dev"
                  autoComplete="username"
                  required
                />
              </span>
            </label>

            <label className="form-field">
              <span className="form-label">Password</span>
              <span className="input-group">
                <LockKeyhole size={15} aria-hidden="true" />
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                    clearAuthError()
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-group__action"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              iconRight={ArrowRight}
              disabled={!email.trim() || !password || isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in to workspace'}
            </Button>
          </form>

          <div className="login-hint">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>
            Sign-in is verified by the backend. Workspace permissions control which
            role-based tools are shown.
            </span>
          </div>

          <p className="login-footnote">
            Use the account credentials configured for your workspace.
            <br />
            Your session is saved in this browser and verified with the backend.
          </p>
        </div>
      </section>
    </div>
  )
}

export default LoginPage
