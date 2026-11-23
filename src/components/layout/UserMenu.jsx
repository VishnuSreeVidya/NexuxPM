import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useToast } from '../../hooks/useToast'
import { getApiErrorMessage } from '../../services/api'
import { ROLE_LABELS } from '../../utils/constants'
import { Avatar } from '../common/Avatar'

export function UserMenu() {
  const { currentUser, logout, switchRole } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [switchingRole, setSwitchingRole] = useState('')
  const [switchError, setSwitchError] = useState('')
  const anchorRef = useRef(null)

  useClickOutside(anchorRef, () => setOpen(false), open)

  if (!currentUser) return null

  const assignedRoles = Array.isArray(currentUser.roles) ? currentUser.roles : []

  function goTo(path) {
    setOpen(false)
    navigate(path)
  }

  function handleLogout() {
    setOpen(false)
    logout()
    notify('You have been signed out of your workspace.', { type: 'info' })
    navigate('/login', { replace: true })
  }

  async function handleSwitchRole(role) {
    setSwitchingRole(role)
    setSwitchError('')
    try {
      await switchRole(role)
      setOpen(false)
      navigate('/dashboard', { replace: true })
      notify(`Switched to your ${ROLE_LABELS[role]} workspace.`, {
        type: 'success',
        title: 'Role switched',
      })
    } catch (error) {
      setSwitchError(getApiErrorMessage(error, 'Role could not be changed. Please try again.'))
    } finally {
      setSwitchingRole('')
    }
  }

  return (
    <div className="popover-anchor" ref={anchorRef}>
      <button
        type="button"
        className="user-chip"
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar
          name={currentUser.name}
          userId={currentUser.id}
          hasPhoto={currentUser.profileImageAvailable}
          photoVersion={currentUser.profilePhotoVersion}
          color={currentUser.avatarColor}
          size="sm"
        />
        <span className="user-chip__meta">
          <span className="user-chip__name">{currentUser.name}</span>
          <span className="user-chip__role">{ROLE_LABELS[currentUser.role]}</span>
        </span>
        <ChevronDown size={14} className="text-muted" aria-hidden="true" />
      </button>

      {open ? (
        <div className="popover" role="menu">
          <div className="user-menu__header">
            <Avatar
              name={currentUser.name}
              userId={currentUser.id}
              hasPhoto={currentUser.profileImageAvailable}
              photoVersion={currentUser.profilePhotoVersion}
              color={currentUser.avatarColor}
              size="lg"
            />
            <div className="text-truncate">
              <p className="user-menu__name">{currentUser.name}</p>
              <p className="user-menu__email">{currentUser.email}</p>
            </div>
          </div>
          <div className="popover__body">
            {assignedRoles.length > 1 ? (
              <>
                <div className="menu-divider" />
                <div role="group" aria-label="Switch role">
                  <p className="panel__section-title">Switch role</p>
                  {assignedRoles.map((role) => (
                    <button
                      type="button"
                      key={role}
                      className="menu-item"
                      role="menuitemradio"
                      aria-checked={currentUser.role === role}
                      disabled={Boolean(switchingRole)}
                      onClick={() => handleSwitchRole(role)}
                    >
                      <span>{ROLE_LABELS[role]}</span>
                      {currentUser.role === role ? <Check size={14} aria-label="Active role" /> : null}
                      {switchingRole === role ? <span>Switching…</span> : null}
                    </button>
                  ))}
                  {switchError ? <p className="alert alert--danger" role="alert">{switchError}</p> : null}
                </div>
                <div className="menu-divider" />
              </>
            ) : null}
            <button type="button" className="menu-item" role="menuitem" onClick={() => goTo('/profile')}>
              <UserRound size={16} aria-hidden="true" />
              My profile
            </button>
            <button type="button" className="menu-item" role="menuitem" onClick={() => goTo('/settings')}>
              <Settings size={16} aria-hidden="true" />
              Settings
            </button>
            <div className="menu-divider" />
            <button
              type="button"
              className="menu-item menu-item--danger"
              role="menuitem"
              onClick={handleLogout}
            >
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default UserMenu
