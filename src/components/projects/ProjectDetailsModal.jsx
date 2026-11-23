import { CalendarDays, Flag, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { getApiErrorMessage } from '../../services/api'
import { Avatar } from '../common/Avatar'
import { Button } from '../common/Button'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import { ProgressBar } from '../common/ProgressBar'
import { StatusBadge } from '../common/StatusBadge'
import { MilestoneList } from '../dashboard/MilestoneList'
import {
  getProjectMembers,
  getProjectMilestones,
  getProjectProgress,
  getProjectTaskCounts,
} from '../../utils/selectors'
import { formatDateRange, isOverdueDate } from '../../utils/dateUtils'
import { ROLE_LABELS, ROLES, TASK_PRIORITIES, TASK_STATUSES } from '../../utils/constants'

export function ProjectDetailsModal({ open, onClose, project, state }) {
  const { currentUser, getProject, updateProject, reloadAssignableUsers } = useAuth()
  const { getAssignableUserState } = useData()
  const [mode, setMode] = useState('')
  const [teamLeaderIds, setTeamLeaderIds] = useState([])
  const [projectForm, setProjectForm] = useState(null)
  const [detailError, setDetailError] = useState({ projectId: null, message: '' })
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const liveProject = project
    ? state.projects.find((item) => item.id === project.id) ?? project
    : null
  const currentDetailError = detailError.projectId === liveProject?.id
    ? detailError.message
    : ''
  useEffect(() => {
    setTeamLeaderIds(liveProject?.teamLeaderIds ?? [])
    setMode('')
  }, [liveProject?.id, liveProject?.teamLeaderIds])

  useEffect(() => {
    if (!open || !project?.id) return undefined

    const controller = new AbortController()
    getProject(project.id, controller.signal)
      .then(() => {
        setDetailError({ projectId: project.id, message: '' })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setDetailError({
          projectId: project.id,
          message: getApiErrorMessage(error, 'Project details could not be refreshed.'),
        })
      })

    return () => controller.abort()
  }, [open, project?.id, getProject])

  const isProjectLead = Boolean(
    liveProject
    && currentUser?.role === ROLES.PROJECT_LEAD
    && liveProject.leadId === currentUser.id,
  )
  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN
  const lead = liveProject
    ? state.users.find((user) => user.id === liveProject.leadId)
    : null
  const teamLeaders = state.users.filter((user) => liveProject?.teamLeaderIds?.includes(user.id))
  const members = getProjectMembers(state, liveProject)
  const milestones = getProjectMilestones(state, liveProject?.id)
  const progress = getProjectProgress(state, liveProject?.id)
  const counts = getProjectTaskCounts(state, liveProject?.id)
  const overdue = liveProject
    ? state.tasks.filter(
      (task) =>
        task.projectId === liveProject.id &&
        task.status !== TASK_STATUSES.COMPLETED &&
        isOverdueDate(task.dueDate),
    ).length
    : 0
  const teamLeaderOptions = getAssignableUserState(ROLES.TEAM_LEADER, liveProject?.id)
  const leadOptions = getAssignableUserState(ROLES.PROJECT_LEAD)
  const liveProjectId = liveProject?.id

  useEffect(() => {
    if (!open || !liveProjectId) return undefined
    const controller = new AbortController()
    if (isProjectLead) {
      reloadAssignableUsers(ROLES.TEAM_LEADER, liveProjectId, controller.signal)
    }
    if (isSuperAdmin && mode === 'edit') {
      reloadAssignableUsers(ROLES.PROJECT_LEAD, undefined, controller.signal)
    }
    return () => controller.abort()
  }, [open, liveProjectId, isProjectLead, isSuperAdmin, mode, reloadAssignableUsers])

  if (!liveProject) return null

  function startEdit() {
    setProjectForm({
      name: liveProject.name,
      description: liveProject.description,
      leadId: liveProject.leadId,
      priority: liveProject.priority,
      startDate: liveProject.startDate,
      endDate: liveProject.endDate,
      status: liveProject.status,
    })
    setSaveError('')
    setSaveError('')
    setMode('edit')
  }
  async function saveProject(event) {
    event.preventDefault()
    setIsSaving(true)
    setSaveError('')
    try {
      await updateProject(liveProject.id, projectForm)
      setMode('')
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Project could not be updated. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }
  async function saveTeamLeaders(event) {
    event.preventDefault()
    setIsSaving(true)
    setSaveError('')
    try {
      await updateProject(liveProject.id, { teamLeaderIds })
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Team Leader assignments could not be saved.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Project details"
      subtitle={`${liveProject.code} · Created by ${state.users.find((user) => user.id === liveProject.createdBy)?.name ?? 'Administrator'}`}
      size="lg"
      footer={
        mode === 'edit'
          ? <><Button variant="secondary" onClick={() => setMode('')} disabled={isSaving}>Cancel</Button><Button type="submit" form="project-edit-form" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button></>
          : <><Button variant="secondary" onClick={onClose}>Close</Button>{isProjectLead ? <Button type="submit" form="project-team-form" disabled={isSaving || teamLeaderOptions.loading || Boolean(teamLeaderOptions.error)}>{isSaving ? 'Saving…' : 'Save Team Leaders'}</Button> : null}{isSuperAdmin ? <Button onClick={startEdit}>Edit project</Button> : null}</>
      }
    >
      {currentDetailError ? <p className="alert alert--danger" role="alert">{currentDetailError}</p> : null}
      {saveError ? <p className="alert alert--danger" role="alert">{saveError}</p> : null}
      {mode === 'edit' ? (
        <form id="project-edit-form" className="form" onSubmit={saveProject}>
          <div className="form-grid">
            <label className="form-field"><span className="form-label">Project name</span><input className="input" required value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} /></label>
            <label className="form-field"><span className="form-label">Project Lead</span><select className="select" required disabled={leadOptions.loading || Boolean(leadOptions.error)} value={projectForm.leadId} onChange={(event) => setProjectForm({ ...projectForm, leadId: event.target.value })}>{leadOptions.users.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.email}</option>)}</select></label>
            {leadOptions.error ? <p className="alert alert--danger" role="alert">{leadOptions.error} <Button size="sm" variant="secondary" onClick={() => reloadAssignableUsers(ROLES.PROJECT_LEAD)}>Retry</Button></p> : null}
            <label className="form-field form-field--full"><span className="form-label">Description</span><textarea className="textarea" value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} /></label>
            <label className="form-field"><span className="form-label">Start date</span><input className="input" type="date" required value={projectForm.startDate} onChange={(event) => setProjectForm({ ...projectForm, startDate: event.target.value })} /></label>
            <label className="form-field"><span className="form-label">End date</span><input className="input" type="date" min={projectForm.startDate} required value={projectForm.endDate} onChange={(event) => setProjectForm({ ...projectForm, endDate: event.target.value })} /></label>
            <label className="form-field"><span className="form-label">Priority</span><select className="select" value={projectForm.priority} onChange={(event) => setProjectForm({ ...projectForm, priority: event.target.value })}>{Object.entries(TASK_PRIORITIES).map(([key, value]) => <option key={value} value={value}>{key[0] + key.slice(1).toLowerCase()}</option>)}</select></label>
          </div>
        </form>
      ) : (
        <>
      <div className="project-detail__top">
        <div>
          <h3 className="project-detail__title">{liveProject.name}</h3>
          <p className="project-detail__code">{liveProject.code} · {ROLE_LABELS[ROLES.PROJECT_LEAD]} owned</p>
        </div>
        <StatusBadge type="project" value={liveProject.status} dot />
      </div>

      <p className="project-detail__description">{liveProject.description}</p>

      <div className="project-detail__stats">
        <div className="project-detail__stat">
          <strong>{counts.total}</strong>
          <span>Total tasks</span>
        </div>
        <div className="project-detail__stat">
          <strong>{counts[TASK_STATUSES.COMPLETED]}</strong>
          <span>Completed</span>
        </div>
        <div className="project-detail__stat">
          <strong className={overdue ? 'text-danger' : ''}>{overdue}</strong>
          <span>Overdue</span>
        </div>
        <div className="project-detail__stat">
          <strong>{progress}%</strong>
          <span>Progress</span>
        </div>
      </div>

      <div className="project-detail__section">
        <div className="progress-meta">
          <span>Delivery progress</span>
          <strong>{progress}%</strong>
        </div>
        <ProgressBar value={progress} tone={progress === 100 ? 'success' : undefined} label="Project progress" />
      </div>

      <div className="project-detail__section">
        <div className="project-detail__meta">
          <div className="meta-item">
            <p className="meta-item__label">Timeline</p>
            <p className="meta-item__value">{formatDateRange(liveProject.startDate, liveProject.endDate)}</p>
          </div>
          <div className="meta-item">
            <p className="meta-item__label">Project lead</p>
            {lead ? (
              <div className="table-user" style={{ marginTop: 3 }}>
                <Avatar name={lead.name} userId={lead.id} color={lead.avatarColor} size="xs" />
                <span className="meta-item__value">{lead.name}</span>
              </div>
            ) : (
              <p className="meta-item__value">Unassigned</p>
            )}
          </div>
          <div className="meta-item">
            <p className="meta-item__label">Team leaders</p>
            <p className="meta-item__value">
              {teamLeaders.length ? teamLeaders.map((user) => user.name).join(', ') : 'Not assigned'}
            </p>
          </div>
        </div>
      </div>

      <div className="project-detail__section">
        <div className="project-detail__section-title">
          <span>Task distribution</span>
        </div>
        <div className="task-status-summary">
          {Object.entries(TASK_STATUSES).map(([, status]) => (
            <div className="task-status-summary__item" key={status}>
              <strong>{counts[status]}</strong>
              <span>{status.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="project-detail__section">
        <div className="project-detail__section-title">
          <span>Team</span>
          <span className="text-small text-muted">{members.length} people</span>
        </div>
        {members.length ? (
          <div className="team-chips">
            {members.map((member) => (
              <span className="team-chip" key={member.id}>
                <Avatar name={member.name} userId={member.id} color={member.avatarColor} size="xs" />
                <span className="team-chip__body">
                  <span className="team-chip__name">{member.name}</span>
                  <span className="team-chip__role">{ROLE_LABELS[member.role]}</span>
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="empty-inline">No team members assigned yet.</p>
        )}
      </div>

      <div className="project-detail__section">
        <div className="project-detail__section-title">
          <span>Milestones</span>
          <span className="badge badge--neutral">
            <Flag size={11} aria-hidden="true" />
            {milestones.length}
          </span>
        </div>
        {milestones.length ? (
          <MilestoneList milestones={milestones} projects={state.projects} showProject={false} limit={6} />
        ) : (
          <EmptyState
            icon={Flag}
            title="No milestones yet"
            description="The Project Lead can add milestones in the project module."
          />
        )}
      </div>

      <div className="project-detail__section">
        <div className="project-detail__section-title">
          <span>Team leaders</span>
          <span className="text-small text-muted">Assigned by the Project Lead</span>
        </div>
        {isProjectLead ? (
          <form id="project-team-form" className="form" onSubmit={saveTeamLeaders}>
            {teamLeaderOptions.error ? <p className="alert alert--danger" role="alert">{teamLeaderOptions.error} <Button size="sm" variant="secondary" onClick={() => reloadAssignableUsers(ROLES.TEAM_LEADER, liveProject.id)}>Retry</Button></p> : null}
            {teamLeaderOptions.loading && !teamLeaderOptions.users.length ? <p className="form-hint" role="status">Loading Team Leaders…</p> : null}
            {!teamLeaderOptions.loading && !teamLeaderOptions.error && !teamLeaderOptions.users.length ? <p className="form-hint">No Team Leaders are available to assign.</p> : null}
            {teamLeaderOptions.users.map((user) => (
              <label className="checkbox" key={user.id}>
                <input type="checkbox" checked={teamLeaderIds.includes(user.id)} onChange={(event) => setTeamLeaderIds(event.target.checked ? [...teamLeaderIds, user.id] : teamLeaderIds.filter((id) => id !== user.id))} />
                {user.name} · {user.email}
              </label>
            ))}
          </form>
        ) : teamLeaders.length ? (
          <div className="team-chips">
            {teamLeaders.map((user) => (
              <span className="team-chip" key={user.id}>
                <Avatar name={user.name} userId={user.id} color={user.avatarColor} size="xs" />
                <span className="team-chip__body">
                  <span className="team-chip__name">{user.name}</span>
                  <span className="team-chip__role">{user.title}</span>
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="empty-inline">
            <Users size={13} aria-hidden="true" /> No Team Leader assigned. The Project Lead will manage this.
          </p>
        )}
      </div>

      <p className="settings-note">
        <CalendarDays size={13} aria-hidden="true" /> Project creation is restricted to the Super Admin.
        Team Leaders are assigned by the Project Lead, and tasks are created by Team Leaders.
      </p>
        </>
      )}
    </Modal>
  )
}

export default ProjectDetailsModal
