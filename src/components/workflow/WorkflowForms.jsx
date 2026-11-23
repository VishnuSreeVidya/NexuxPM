import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { getApiErrorMessage } from '../../services/api'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { ROLES, TASK_PRIORITIES } from '../../utils/constants'
import { addDaysISO, todayISO } from '../../utils/dateUtils'
import { getVisibleProjects } from '../../utils/selectors'

const EMPTY_PROJECT = {
  name: '',
  code: '',
  description: '',
  leadId: '',
  priority: TASK_PRIORITIES.MEDIUM,
  startDate: todayISO(),
  endDate: addDaysISO(30),
}

export function ProjectCreateModal({ open, onClose }) {
  const { getAssignableUserState } = useData()
  const { createProject, reloadAssignableUsers } = useAuth()
  const [form, setForm] = useState(EMPTY_PROJECT)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const leadOptions = getAssignableUserState(ROLES.PROJECT_LEAD)

  useEffect(() => {
    if (!open) return undefined
    const controller = new AbortController()
    reloadAssignableUsers(ROLES.PROJECT_LEAD, undefined, controller.signal)
    return () => controller.abort()
  }, [open, reloadAssignableUsers])

  async function submit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await createProject({
        ...form,
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim(),
      })
      setForm({ ...EMPTY_PROJECT, startDate: todayISO(), endDate: addDaysISO(30) })
      onClose()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Project could not be created. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create project" subtitle="Create a delivery project and assign its Project Lead." size="lg">
      <form className="form" onSubmit={submit}>
        {submitError ? <p className="alert alert--danger" role="alert">{submitError}</p> : null}
        {leadOptions.error ? <p className="alert alert--danger" role="alert">{leadOptions.error} <Button size="sm" variant="secondary" onClick={() => reloadAssignableUsers(ROLES.PROJECT_LEAD)}>Retry</Button></p> : null}
        <div className="form-grid">
          <label className="form-field"><span className="form-label">Project name <span>*</span></span><input className="input" required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-field"><span className="form-label">Project code</span><input className="input" maxLength={12} placeholder="Auto-generated if blank" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
          <label className="form-field form-field--full"><span className="form-label">Description</span><textarea className="textarea" maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="form-field"><span className="form-label">Project Lead <span>*</span></span><select className="select" required disabled={leadOptions.loading || Boolean(leadOptions.error)} value={form.leadId} onChange={(event) => setForm({ ...form, leadId: event.target.value })}><option value="">{leadOptions.loading ? 'Loading Project Leads…' : leadOptions.users.length ? 'Select a Project Lead' : 'No Project Leads available'}</option>{leadOptions.users.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.email}</option>)}</select></label>
          <label className="form-field"><span className="form-label">Priority</span><select className="select" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{Object.entries(TASK_PRIORITIES).map(([key, value]) => <option value={value} key={value}>{key[0] + key.slice(1).toLowerCase()}</option>)}</select></label>
          <label className="form-field"><span className="form-label">Start date <span>*</span></span><input className="input" type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
          <label className="form-field"><span className="form-label">End date <span>*</span></span><input className="input" type="date" min={form.startDate} required value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
        </div>
        <div className="form-actions"><Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={isSubmitting || leadOptions.loading || Boolean(leadOptions.error) || !leadOptions.users.length}>{isSubmitting ? 'Creating…' : 'Create project'}</Button></div>
      </form>
    </Modal>
  )
}

export function TaskCreateModal({ open, onClose }) {
  const { state, getAssignableUserState } = useData()
  const { currentUser, createTask, reloadAssignableUsers } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const projects = useMemo(() => getVisibleProjects(state, currentUser), [state, currentUser])
  const [form, setForm] = useState({
    projectId: '',
    title: '',
    description: '',
    assigneeId: '',
    qaId: '',
    priority: TASK_PRIORITIES.MEDIUM,
    dueDate: addDaysISO(7),
  })

  async function submit(event) {
    event.preventDefault()
    const project = projects.find((item) => item.id === form.projectId)
    if (!project || !project.teamLeaderIds?.includes(currentUser.id)) {
      setSubmitError('You are no longer assigned to this project as a Team Leader. Refresh the page and try again.')
      return
    }
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await createTask({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
      })
      setForm({ projectId: '', title: '', description: '', assigneeId: '', qaId: '', priority: TASK_PRIORITIES.MEDIUM, dueDate: addDaysISO(7) })
      onClose()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Task could not be created. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const teamProjects = projects.filter((project) => project.teamLeaderIds?.includes(currentUser.id))
  const developerOptions = getAssignableUserState(ROLES.DEVELOPER, form.projectId)
  const qaOptions = getAssignableUserState(ROLES.QA_ENGINEER, form.projectId)

  useEffect(() => {
    if (!open || !form.projectId) return undefined
    const controller = new AbortController()
    reloadAssignableUsers(ROLES.DEVELOPER, form.projectId, controller.signal)
    reloadAssignableUsers(ROLES.QA_ENGINEER, form.projectId, controller.signal)
    return () => controller.abort()
  }, [open, form.projectId, reloadAssignableUsers])

  return (
    <Modal open={open} onClose={onClose} title="Create and assign task" subtitle="Choose a project, developer, QA owner, and due date." size="lg">
      <form className="form" onSubmit={submit}>
        {submitError ? <p className="alert alert--danger" role="alert">{submitError}</p> : null}
        <div className="form-grid">
          <label className="form-field form-field--full"><span className="form-label">Project <span>*</span></span><select className="select" required value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value, assigneeId: '', qaId: '' })}><option value="">Select a project</option>{teamProjects.map((project) => <option value={project.id} key={project.id}>{project.name} · {project.code}</option>)}</select></label>
          <label className="form-field form-field--full"><span className="form-label">Task title <span>*</span></span><input className="input" required maxLength={100} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="form-field form-field--full"><span className="form-label">Description</span><textarea className="textarea" maxLength={1000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="form-field"><span className="form-label">Developer <span>*</span></span><select className="select" required disabled={!form.projectId || developerOptions.loading || Boolean(developerOptions.error)} value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}><option value="">{!form.projectId ? 'Select a project first' : developerOptions.loading ? 'Loading Developers…' : developerOptions.users.length ? 'Assign developer' : 'No Developers available'}</option>{developerOptions.users.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.email}</option>)}</select></label>
          <label className="form-field"><span className="form-label">QA Engineer <span>*</span></span><select className="select" required disabled={!form.projectId || qaOptions.loading || Boolean(qaOptions.error)} value={form.qaId} onChange={(event) => setForm({ ...form, qaId: event.target.value })}><option value="">{!form.projectId ? 'Select a project first' : qaOptions.loading ? 'Loading QA Engineers…' : qaOptions.users.length ? 'Assign QA owner' : 'No QA Engineers available'}</option>{qaOptions.users.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.email}</option>)}</select></label>
          <label className="form-field"><span className="form-label">Priority</span><select className="select" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{Object.entries(TASK_PRIORITIES).map(([key, value]) => <option value={value} key={value}>{key[0] + key.slice(1).toLowerCase()}</option>)}</select></label>
          <label className="form-field"><span className="form-label">Due date <span>*</span></span><input className="input" type="date" min={todayISO()} required value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
        </div>
        {!teamProjects.length ? <p className="form-hint">You need to be assigned as a Team Leader on a project before creating tasks.</p> : null}
        {developerOptions.error || qaOptions.error ? <p className="alert alert--danger" role="alert">{developerOptions.error || qaOptions.error} <Button size="sm" variant="secondary" onClick={() => { reloadAssignableUsers(ROLES.DEVELOPER, form.projectId); reloadAssignableUsers(ROLES.QA_ENGINEER, form.projectId) }}>Retry</Button></p> : null}
        <div className="form-actions"><Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={!teamProjects.length || isSubmitting || developerOptions.loading || qaOptions.loading || Boolean(developerOptions.error) || Boolean(qaOptions.error)}>{isSubmitting ? 'Creating…' : 'Create task'}</Button></div>
      </form>
    </Modal>
  )
}
