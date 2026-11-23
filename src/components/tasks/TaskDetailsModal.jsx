import { AlertTriangle, Check, FlaskConical, MessageSquare, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { getApiErrorMessage } from '../../services/api'
import { Avatar } from '../common/Avatar'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { PriorityLabel, StatusBadge } from '../common/StatusBadge'
import { ProgressBar } from '../common/ProgressBar'
import {
  formatDate,
  formatRelativeTime,
  getDueLabel,
  isOverdueDate,
  todayISO,
} from '../../utils/dateUtils'
import { BUG_SEVERITIES, BUG_STATUSES, ROLES, TASK_PRIORITIES, TASK_STATUSES } from '../../utils/constants'
import { canEditTask, canTransitionTask, getAllowedTransitions } from '../../utils/access'

export function TaskDetailsModal({ open, onClose, task, state }) {
  const {
    currentUser,
    reloadAssignableUsers,
    getTask,
    getTaskComments,
    createTaskComment,
    updateTask,
    transitionTask,
    createBug,
    updateBug,
    reloadBugs,
  } = useAuth()
  const {
    bugsLoading,
    bugsError,
    getAssignableUserState,
  } = useData()
  const [bugFormOpen, setBugFormOpen] = useState(false)
  const [bugTitle, setBugTitle] = useState('')
  const [bugDescription, setBugDescription] = useState('')
  const [bugSeverity, setBugSeverity] = useState(BUG_SEVERITIES.MEDIUM)
  const [mode, setMode] = useState('')
  const [taskForm, setTaskForm] = useState(null)
  const [taskError, setTaskError] = useState({ taskId: null, message: '' })
  const [isBusy, setIsBusy] = useState(false)
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const developerOptions = getAssignableUserState(ROLES.DEVELOPER, task?.projectId)
  const qaOptions = getAssignableUserState(ROLES.QA_ENGINEER, task?.projectId)

  const loadComments = useCallback(async (taskId, signal) => {
    setCommentsLoading(true)
    setCommentsError('')
    setComments([])
    try {
      const loadedComments = await getTaskComments(taskId, signal)
      setComments(loadedComments)
    } catch (error) {
      if (error.name === 'AbortError') return
      setCommentsError(getApiErrorMessage(error, 'Comments could not be loaded.'))
    } finally {
      if (!signal?.aborted) setCommentsLoading(false)
    }
  }, [getTaskComments])

  useEffect(() => {
    if (!open || !task?.id) return undefined

    const controller = new AbortController()
    getTask(task.id, controller.signal)
      .catch((error) => {
        if (error.name === 'AbortError') return
        setTaskError({
          taskId: task.id,
          message: getApiErrorMessage(error, 'Task details could not be refreshed.'),
        })
      })
    return () => controller.abort()
  }, [open, task?.id, getTask])

  useEffect(() => {
    if (!open || !task?.projectId || currentUser?.role !== ROLES.TEAM_LEADER) return undefined
    const controller = new AbortController()
    reloadAssignableUsers(ROLES.DEVELOPER, task.projectId, controller.signal)
    reloadAssignableUsers(ROLES.QA_ENGINEER, task.projectId, controller.signal)
    return () => controller.abort()
  }, [open, task?.projectId, currentUser?.role, reloadAssignableUsers])

  useEffect(() => {
    if (!open || !task?.id) return undefined

    const controller = new AbortController()
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadComments(task.id, controller.signal)
      }
    })
    return () => controller.abort()
  }, [open, task?.id, loadComments])

  if (!task) return null

  const liveTask = state.tasks.find((item) => item.id === task.id) ?? task
  const currentTaskError = taskError.taskId === liveTask.id ? taskError.message : ''
  const project = state.projects.find((item) => item.id === liveTask.projectId)
  const assignee = state.users.find((user) => user.id === liveTask.assigneeId)
  const qa = state.users.find((user) => user.id === liveTask.qaId)
  const creator = state.users.find((user) => user.id === liveTask.createdBy)
  const overdue = liveTask.status !== TASK_STATUSES.COMPLETED && isOverdueDate(liveTask.dueDate)
  const taskBugs = state.bugs.filter((bug) => bug.taskId === liveTask.id)
  const canTest = currentUser?.role === ROLES.QA_ENGINEER && liveTask.qaId === currentUser.id
  const canDevelop = currentUser?.role === ROLES.DEVELOPER && liveTask.assigneeId === currentUser.id
  const canEdit = currentUser?.role === ROLES.TEAM_LEADER && canEditTask(currentUser, liveTask, state)
  const allowedTransitions = getAllowedTransitions(liveTask).filter((status) =>
    canTransitionTask(state, currentUser, liveTask, status),
  )

  async function submitComment(event) {
    event.preventDefault()
    const body = commentText.trim()
    if (!body || isSubmittingComment) return
    setIsSubmittingComment(true)
    setCommentsError('')
    try {
      const comment = await createTaskComment(liveTask.id, body)
      setComments((existing) => [...existing, comment])
      setCommentText('')
    } catch (error) {
      setCommentsError(getApiErrorMessage(error, 'Comment could not be submitted. Please try again.'))
    } finally {
      setIsSubmittingComment(false)
    }
  }

  async function moveTask(status) {
    setIsBusy(true)
    setTaskError({ taskId: liveTask.id, message: '' })
    try {
      await transitionTask(liveTask.id, status)
    } catch (error) {
      setTaskError({
        taskId: liveTask.id,
        message: getApiErrorMessage(error, 'Task status could not be changed. Please try again.'),
      })
    } finally {
      setIsBusy(false)
    }
  }

  function startEdit() {
    setTaskForm({
      title: liveTask.title,
      description: liveTask.description,
      assigneeId: liveTask.assigneeId ?? '',
      qaId: liveTask.qaId ?? '',
      priority: liveTask.priority,
      dueDate: liveTask.dueDate ?? '',
    })
    setTaskError({ taskId: liveTask.id, message: '' })
    setMode('edit')
  }

  async function saveTask(event) {
    event.preventDefault()
    setIsBusy(true)
    setTaskError({ taskId: liveTask.id, message: '' })
    try {
      const updates = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        priority: taskForm.priority,
      }
      if (taskForm.assigneeId && taskForm.assigneeId !== liveTask.assigneeId) {
        updates.assigneeId = taskForm.assigneeId
      }
      if (taskForm.qaId && taskForm.qaId !== liveTask.qaId) {
        updates.qaId = taskForm.qaId
      }
      if (taskForm.dueDate !== (liveTask.dueDate ?? '')) updates.dueDate = taskForm.dueDate
      await updateTask(liveTask.id, updates)
      setMode('')
    } catch (error) {
      setTaskError({
        taskId: liveTask.id,
        message: getApiErrorMessage(error, 'Task could not be updated. Please try again.'),
      })
    } finally {
      setIsBusy(false)
    }
  }

  async function reportBug(event) {
    event.preventDefault()
    setIsBusy(true)
    setTaskError({ taskId: liveTask.id, message: '' })
    try {
      await createBug({
        projectId: liveTask.projectId,
        taskId: liveTask.id,
        title: bugTitle.trim(),
        description: bugDescription.trim(),
        severity: bugSeverity,
      })
      setBugTitle('')
      setBugDescription('')
      setBugFormOpen(false)
    } catch (error) {
      setTaskError({
        taskId: liveTask.id,
        message: getApiErrorMessage(error, 'Bug report could not be submitted. Please try again.'),
      })
    } finally {
      setIsBusy(false)
    }
  }

  async function updateBugStatus(bugId, status) {
    setIsBusy(true)
    setTaskError({ taskId: liveTask.id, message: '' })
    try {
      await updateBug(bugId, status)
    } catch (error) {
      setTaskError({
        taskId: liveTask.id,
        message: getApiErrorMessage(error, 'Bug status could not be updated. Please try again.'),
      })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Task details"
      subtitle={project ? `${project.name} · ${project.code}` : 'Project task'}
      size="lg"
      footer={<>
        {mode === 'edit' ? <><Button variant="secondary" onClick={() => setMode('')} disabled={isBusy}>Cancel</Button><Button type="submit" form="task-edit-form" disabled={isBusy}>{isBusy ? 'Saving…' : 'Save task'}</Button></> : null}
        {mode !== 'edit' && canEdit ? <Button variant="secondary" onClick={startEdit} disabled={isBusy}>Edit task</Button> : null}
        {mode !== 'edit' && canDevelop ? allowedTransitions.map((status) => <Button key={status} onClick={() => moveTask(status)} disabled={isBusy}>{status === TASK_STATUSES.IN_REVIEW ? 'Submit for QA review' : 'Start work'}</Button>) : null}
        {mode !== 'edit' && canTest && allowedTransitions.includes(TASK_STATUSES.TESTING) ? <Button icon={FlaskConical} onClick={() => moveTask(TASK_STATUSES.TESTING)} disabled={isBusy}>Start testing</Button> : null}
        {mode !== 'edit' && canTest && allowedTransitions.includes(TASK_STATUSES.COMPLETED) ? <>
          <Button variant="danger" icon={RotateCcw} onClick={() => moveTask(TASK_STATUSES.IN_PROGRESS)} disabled={isBusy}>Reject & return</Button>
          <Button variant="success" icon={ShieldCheck} disabled={isBusy || bugsLoading || Boolean(bugsError) || taskBugs.some((bug) => bug.status !== BUG_STATUSES.VERIFIED)} onClick={() => moveTask(TASK_STATUSES.COMPLETED)}>Approve</Button>
        </> : null}
        {canTest && [TASK_STATUSES.IN_REVIEW, TASK_STATUSES.TESTING].includes(liveTask.status) ? <Button variant="secondary" icon={AlertTriangle} onClick={() => setBugFormOpen((value) => !value)}>Report bug</Button> : null}
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </>}
    >
      {currentTaskError ? <p className="alert alert--danger" role="alert">{currentTaskError}</p> : null}
      {mode === 'edit' ? (
        <form id="task-edit-form" className="form project-detail__section" onSubmit={saveTask}>
          <div className="form-grid">
            <label className="form-field form-field--full"><span className="form-label">Task title</span><input className="input" required maxLength={100} value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} /></label>
            <label className="form-field form-field--full"><span className="form-label">Description</span><textarea className="textarea" maxLength={1000} value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /></label>
            <label className="form-field"><span className="form-label">Developer</span><select className="select" disabled={developerOptions.loading || Boolean(developerOptions.error)} value={taskForm.assigneeId} onChange={(event) => setTaskForm({ ...taskForm, assigneeId: event.target.value })}><option value="">{developerOptions.loading ? 'Loading Developers…' : developerOptions.users.length ? 'No developer assigned' : 'No Developers available'}</option>{developerOptions.users.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.email}</option>)}</select></label>
            <label className="form-field"><span className="form-label">QA Engineer</span><select className="select" disabled={qaOptions.loading || Boolean(qaOptions.error)} value={taskForm.qaId} onChange={(event) => setTaskForm({ ...taskForm, qaId: event.target.value })}><option value="">{qaOptions.loading ? 'Loading QA Engineers…' : qaOptions.users.length ? 'No QA assigned' : 'No QA Engineers available'}</option>{qaOptions.users.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.email}</option>)}</select></label>
            {developerOptions.error || qaOptions.error ? <p className="alert alert--danger" role="alert">{developerOptions.error || qaOptions.error} <Button size="sm" variant="secondary" onClick={() => { reloadAssignableUsers(ROLES.DEVELOPER, liveTask.projectId); reloadAssignableUsers(ROLES.QA_ENGINEER, liveTask.projectId) }}>Retry</Button></p> : null}
            <label className="form-field"><span className="form-label">Priority</span><select className="select" value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>{Object.entries(TASK_PRIORITIES).map(([label, value]) => <option value={value} key={value}>{label[0] + label.slice(1).toLowerCase()}</option>)}</select></label>
            <label className="form-field"><span className="form-label">Due date</span><input className="input" type="date" min={taskForm.dueDate === liveTask.dueDate && liveTask.dueDate < todayISO() ? liveTask.dueDate : todayISO()} value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></label>
          </div>
        </form>
      ) : null}
      <div className="task-detail__project">
        <span>{liveTask.id.toUpperCase()}</span>
        {creator ? <span>· Created by {creator.name}</span> : null}
      </div>
      <h3 className="task-detail__title">{liveTask.title}</h3>
      <p className="task-detail__description">{liveTask.description}</p>

      {overdue ? (
        <div className="alert alert--danger" style={{ marginTop: 14 }}>
          <span>This task is overdue ({getDueLabel(liveTask.dueDate)}).</span>
        </div>
      ) : null}

      <div className="task-detail__meta">
        <div className="meta-item">
          <p className="meta-item__label">Status</p>
          <StatusBadge type="task" value={liveTask.status} />
        </div>
        <div className="meta-item">
          <p className="meta-item__label">Priority</p>
          <PriorityLabel value={liveTask.priority} />
        </div>
        <div className="meta-item">
          <p className="meta-item__label">Start date</p>
          <p className="meta-item__value">{formatDate(liveTask.startDate)}</p>
        </div>
        <div className="meta-item">
          <p className="meta-item__label">Due date</p>
          <p className={`meta-item__value ${overdue ? 'text-danger' : ''}`.trim()}>
            {formatDate(liveTask.dueDate)} · {getDueLabel(liveTask.dueDate)}
          </p>
        </div>
        <div className="meta-item" style={{ gridColumn: '1 / -1' }}>
          <div className="progress-meta">
            <span>Work progress</span>
            <strong>{liveTask.progress}%</strong>
          </div>
          <ProgressBar
            value={liveTask.progress}
            tone={liveTask.progress === 100 ? 'success' : undefined}
            label="Task progress"
          />
        </div>
      </div>

      <div className="task-detail__people">
        <div className="task-detail__person">
          {assignee ? (
            <Avatar name={assignee.name} userId={assignee.id} color={assignee.avatarColor} size="sm" />
          ) : null}
          <div>
            <p className="task-detail__person-label">Developer</p>
            <p className="task-detail__person-name">{assignee?.name ?? 'Unassigned'}</p>
          </div>
        </div>
        <div className="task-detail__person">
          {qa ? <Avatar name={qa.name} userId={qa.id} color={qa.avatarColor} size="sm" /> : null}
          <div>
            <p className="task-detail__person-label">QA Engineer</p>
            <p className="task-detail__person-name">{qa?.name ?? 'Not assigned'}</p>
          </div>
        </div>

        {taskBugs.length || bugsLoading || bugsError ? (
          <div className="project-detail__section" style={{ gridColumn: '1 / -1' }}>
            <div className="project-detail__section-title"><span>Reported bugs</span><span className="badge badge--neutral">{taskBugs.length}</span></div>
            {bugsLoading ? <p className="form-hint" role="status">Loading bugs…</p> : null}
            {bugsError ? <div className="alert alert--danger" role="alert">{bugsError} <Button size="sm" variant="secondary" onClick={reloadBugs}>Retry</Button></div> : null}
            {taskBugs.map((bug) => (
              <div className="bug-item" key={bug.id}>
                <StatusBadge type="severity" value={bug.severity} />
                <div className="bug-item__body"><p className="bug-item__title">{bug.title}</p><p className="bug-item__meta">{bug.description}</p><p className="bug-item__meta">Assigned to {state.users.find((user) => user.id === bug.assignedTo)?.name ?? 'Unassigned'}</p></div>
                <StatusBadge type="bug" value={bug.status} />
                {canTest && bug.status === BUG_STATUSES.FIXED ? <>
                  <Button size="sm" icon={Check} disabled={isBusy} onClick={() => updateBugStatus(bug.id, BUG_STATUSES.VERIFIED)}>Verify</Button>
                  <Button size="sm" variant="danger" icon={RotateCcw} disabled={isBusy} onClick={() => updateBugStatus(bug.id, BUG_STATUSES.REOPENED)}>Reject fix</Button>
                </> : null}
                {canDevelop && bug.assignedTo === currentUser.id && [BUG_STATUSES.OPEN, BUG_STATUSES.IN_PROGRESS, BUG_STATUSES.REOPENED].includes(bug.status) ? <Button size="sm" disabled={isBusy} onClick={() => updateBugStatus(bug.id, BUG_STATUSES.FIXED)}>Submit fix</Button> : null}
              </div>
            ))}
            {taskBugs.some((bug) => bug.status !== BUG_STATUSES.VERIFIED) ? <p className="form-hint">Verify all reported bugs before approving this task.</p> : null}
          </div>
        ) : null}

        {bugFormOpen ? (
          <form className="form project-detail__section" style={{ gridColumn: '1 / -1' }} onSubmit={reportBug}>
            <div className="project-detail__section-title"><span>Report a bug</span></div>
            <label className="form-field"><span className="form-label">Title <span>*</span></span><input className="input" required maxLength={100} value={bugTitle} onChange={(event) => setBugTitle(event.target.value)} /></label>
            <label className="form-field"><span className="form-label">Reproduction notes</span><textarea className="textarea" required maxLength={1000} value={bugDescription} onChange={(event) => setBugDescription(event.target.value)} /></label>
            <label className="form-field"><span className="form-label">Severity</span><select className="select" value={bugSeverity} onChange={(event) => setBugSeverity(event.target.value)}>{Object.entries(BUG_SEVERITIES).map(([label, value]) => <option value={value} key={value}>{label[0] + label.slice(1).toLowerCase()}</option>)}</select></label>
            <Button type="submit" icon={Send} disabled={isBusy || bugsLoading}>{isBusy ? 'Submitting…' : 'Submit bug report'}</Button>
          </form>
        ) : null}
      </div>

      <div className="project-detail__section">
        <div className="project-detail__section-title">
          <span>Comments</span>
          <span className="badge badge--neutral">
            <MessageSquare size={11} aria-hidden="true" />
            {comments.length}
          </span>
        </div>

        {commentsError ? (
          <div className="alert alert--danger" role="alert">
            {commentsError}{' '}
            <Button size="sm" variant="secondary" onClick={() => loadComments(liveTask.id)}>
              Retry
            </Button>
          </div>
        ) : commentsLoading && !comments.length ? (
          <p className="form-hint" role="status">Loading comments…</p>
        ) : comments.length ? (
          <div className="comment-list">
            {comments.map((comment) => {
              const author = comment.author ?? state.users.find((user) => user.id === comment.authorId)
              const authorName = author?.name ?? 'Employee'
              return (
                <div className="comment" key={comment.id}>
                  <Avatar
                    name={authorName}
                    userId={comment.authorId}
                    color={state.users.find((user) => user.id === comment.authorId)?.avatarColor}
                    size="sm"
                  />
                  <div className="comment__body">
                    <div className="comment__head">
                      <span className="comment__author">{authorName}</span>
                      <span className="comment__time">{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p className="comment__text">{comment.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="comment-empty">
            No comments on this task yet.
          </p>
        )}
        <form className="form" onSubmit={submitComment}>
          <label className="form-field">
            <span className="form-label">Add a comment</span>
            <textarea
              className="textarea"
              maxLength={2000}
              required
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Share an update with the task team…"
            />
          </label>
          <Button
            type="submit"
            icon={Send}
            disabled={isSubmittingComment || !commentText.trim()}
          >
            {isSubmittingComment ? 'Posting…' : 'Post comment'}
          </Button>
        </form>
      </div>
    </Modal>
  )
}

export default TaskDetailsModal
