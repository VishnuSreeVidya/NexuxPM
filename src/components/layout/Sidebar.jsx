import { NavLink } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getNavigationForUser } from '../../routes/navigation'
import { ROLE_LABELS } from '../../utils/constants'
import { Avatar } from '../common/Avatar'

export function Sidebar({ open, onNavigate }) {
  const { currentUser } = useAuth()

  if (!currentUser) return null

  const sections = getNavigationForUser(currentUser)

  return (
    <aside
      className={`sidebar ${open ? 'sidebar--open' : ''}`.trim()}
      aria-label="Primary navigation"
    >
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden="true">
          <Layers size={20} />
        </span>
        <div className="sidebar__brand-text">
          <span className="sidebar__product">NexusPM</span>
          <span className="sidebar__tagline">Delivery workspace</span>
        </div>
      </div>

      <div className="sidebar__workspace">
        <p className="sidebar__workspace-label">Signed in as</p>
        <div className="sidebar__user">
          <Avatar
            name={currentUser.name}
            userId={currentUser.id}
            hasPhoto={currentUser.profileImageAvailable}
            photoVersion={currentUser.profilePhotoVersion}
            color={currentUser.avatarColor}
            size="sm"
            title={currentUser.name}
          />
          <div className="sidebar__user-meta">
            <span className="sidebar__user-name">{currentUser.name}</span>
            <span className="sidebar__user-role">{ROLE_LABELS[currentUser.role]}</span>
          </div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {sections.map((section) => (
          <div className="sidebar__group" key={section.id}>
            <p className="sidebar__group-label">{section.label}</p>
            <div className="sidebar__group-links">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end
                    className={({ isActive }) =>
                      `sidebar__link ${isActive ? 'is-active' : ''}`.trim()
                    }
                    onClick={onNavigate}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__status">
          <span className="badge__dot" aria-hidden="true" />
          Database-backed workspace
        </div>
        <p>API-enforced role permissions.</p>
      </div>
    </aside>
  )
}

export default Sidebar
