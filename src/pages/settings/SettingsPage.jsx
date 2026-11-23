import { useState } from 'react'
import {
  CheckCircle2,
  Database,
  Globe2,
  Info,
  Lock,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { ROLE_LABELS } from '../../utils/constants'

export function SettingsPage() {
  const { currentUser } = useAuth()
  const { state, resetDemoData } = useData()
  const { notify } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleReset() {
    resetDemoData()
    setConfirmOpen(false)
    notify('Browser-local preferences have been reset.', {
      type: 'success',
      title: 'Local data reset',
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Account · Preferences"
        title="Settings"
        description="Review your account, browser-local preferences, and server-backed workspace access."
        actions={<span className="badge badge--neutral">Demo environment</span>}
      />

      <div className="settings-columns">
        <div className="settings-stack">
          <section className="panel">
            <div className="panel__header">
              <div>
                <h2 className="panel__title">Account</h2>
                <p className="panel__subtitle">                Your workspace identity</p>
              </div>
              <span className="badge badge--success">Signed in</span>
            </div>
            <div className="panel__body">
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">
                    <ShieldCheck size={14} aria-hidden="true" />
                    Role
                  </div>
                  <p className="settings-row__description">
                    Dashboard content and permissions are scoped to this role.
                  </p>
                </div>
                <span className="settings-value">{ROLE_LABELS[currentUser.role]}</span>
              </div>
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">
                    <Sparkles size={14} aria-hidden="true" />
                    Email address
                  </div>
                  <p className="settings-row__description">
                    Seeded demo identity used for this session.
                  </p>
                </div>
                <span className="settings-value">{currentUser.email}</span>
              </div>
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">
                    <Database size={14} aria-hidden="true" />
                    Department
                  </div>
                  <p className="settings-row__description">
                    Organization grouping for this demo account.
                  </p>
                </div>
                <span className="settings-value">{currentUser.department}</span>
              </div>
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">
                    <Lock size={14} aria-hidden="true" />
                    Session
                  </div>
                  <p className="settings-row__description">
                    Authentication is validated by the backend and the session is stored in this browser.
                  </p>
                </div>
                <span className="settings-value">Browser session</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2 className="panel__title">Workspace preferences</h2>
                <p className="panel__subtitle">
                  Phase 1 uses a fixed light theme and in-app updates.
                </p>
              </div>
            </div>
            <div className="panel__body">
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">
                    <Palette size={14} aria-hidden="true" />
                    Theme
                  </div>
                  <p className="settings-row__description">
                    The delivery workspace uses a high-contrast light interface.
                  </p>
                </div>
                <span className="settings-value">Light</span>
              </div>
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">
                    <Globe2 size={14} aria-hidden="true" />
                    Time zone
                  </div>
                  <p className="settings-row__description">
                    Dates use the browser's local time zone.
                  </p>
                </div>
                <span className="settings-value">Browser default</span>
              </div>
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">
                    <Info size={14} aria-hidden="true" />
                    Notification channel
                  </div>
                  <p className="settings-row__description">
                    Updates are delivered through the in-app notification center.
                  </p>
                </div>
                <span className="settings-value">In-app only</span>
              </div>
            </div>
          </section>

          <section className="panel danger-zone">
            <div className="panel__header">
              <div>
                <h2 className="panel__title">Reset local demo data</h2>
                <p className="panel__subtitle">
                  Restore browser-local profile and notification preferences.
                </p>
              </div>
            </div>
            <div className="panel__body">
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">Start from a clean local state</div>
                  <p className="settings-row__description">
                    Local profile edits and read receipts will be reset. Projects, tasks,
                    and bugs stored in PostgreSQL are preserved.
                  </p>
                </div>
                <Button
                  variant="danger"
                  icon={RotateCcw}
                  onClick={() => setConfirmOpen(true)}
                >
                  Reset data
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-stack">
          <section className="panel">
            <div className="panel__header">
              <div>
                <h2 className="panel__title">Browser-local preferences</h2>
                <p className="panel__subtitle">Profile edits and read receipts</p>
              </div>
            </div>
            <div className="panel__body">
              <div className="mini-stats" style={{ marginBottom: 12 }}>
                <div className="mini-stat">
                  <strong>{state.projects.length}</strong>
                  <span>Projects</span>
                </div>
                <div className="mini-stat">
                  <strong>{state.tasks.length}</strong>
                  <span>Tasks</span>
                </div>
                <div className="mini-stat">
                  <strong>{state.notifications.length}</strong>
                  <span>Updates</span>
                </div>
              </div>
              <div className="settings-list">
                <div className="settings-list__item">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>Projects, tasks, and bugs load from the authenticated API.</span>
                </div>
                <div className="settings-list__item">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>Profile edits, read receipts, and demo preferences remain browser-local.</span>
                </div>
                <div className="settings-list__item">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>Refreshing revalidates your session and reloads server-backed records.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2 className="panel__title">Security model</h2>
                <p className="panel__subtitle">Important demo disclaimer</p>
              </div>
            </div>
            <div className="panel__body">
              <div className="alert alert--info" style={{ marginBottom: 11 }}>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  The API verifies credentials and enforces role and assignment rules for
                  project, task, and bug operations.
                </span>
              </div>
              <div className="settings-list">
                <div className="settings-list__item">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>Record visibility is filtered by role and assignment.</span>
                </div>
                <div className="settings-list__item">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>QA owns the final quality gate before a task can complete.</span>
                </div>
                <div className="settings-list__item">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>All demo passwords are intentionally shared for easy switching.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2 className="panel__title">About this build</h2>
                <p className="panel__subtitle">NexusPM delivery workspace</p>
              </div>
            </div>
            <div className="panel__body">
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">Version</div>
                  <p className="settings-row__description">Phase 1 role foundation</p>
                </div>
                <span className="settings-value">1.0.0</span>
              </div>
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">Stack</div>
                  <p className="settings-row__description">React, Vite, React Router</p>
                </div>
                <span className="settings-value">Frontend</span>
              </div>
              <div className="settings-row">
                <div className="settings-row__body">
                  <div className="settings-row__title">Data schema</div>
                  <p className="settings-row__description">Versioned local seed dataset</p>
                </div>
                <span className="settings-value">v1</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleReset}
        title="Reset local demo data?"
        message="This resets browser-local profile and notification data. Projects, tasks, and bugs stored in PostgreSQL are preserved."
        confirmLabel="Reset local data"
        variant="danger"
      />
    </>
  )
}

export default SettingsPage
