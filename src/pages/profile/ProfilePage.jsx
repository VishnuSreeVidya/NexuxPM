import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  CalendarDays,
  Camera,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Avatar } from '../../components/common/Avatar'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { getApiErrorMessage } from '../../services/api'
import {
  getPersonalTasks,
  getVisibleBugs,
  getVisibleProjects,
  getVisibleTasks,
} from '../../utils/selectors'
import { formatDate } from '../../utils/dateUtils'
import {
  BUG_STATUSES,
  PROJECT_STATUSES,
  ROLES,
  ROLE_LABELS,
  TASK_STATUSES,
} from '../../utils/constants'

const AVATAR_COLORS = [
  '#1D4ED8',
  '#0F766E',
  '#B45309',
  '#6D28D9',
  '#BE123C',
  '#0369A1',
  '#9333EA',
  '#C026D3',
  '#DB2777',
  '#059669',
  '#0891B2',
  '#4D7C0F',
]

export function ProfilePage() {
  const {
    currentUser,
    uploadProfilePhoto,
    removeProfilePhoto,
  } = useAuth()
  const { state, updateUserProfile } = useData()
  const { notify } = useToast()

  const [form, setForm] = useState({
    name: currentUser.name,
    title: currentUser.title,
    phone: currentUser.phone,
    location: currentUser.location,
    bio: currentUser.bio,
    avatarColor: currentUser.avatarColor,
  })
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [removePhotoOpen, setRemovePhotoOpen] = useState(false)
  const photoInputRef = useRef(null)
  const photoPreviewRef = useRef('')

  useEffect(() => () => {
    if (photoPreviewRef.current) URL.revokeObjectURL(photoPreviewRef.current)
  }, [])

  function clearPhotoPreview() {
    if (photoPreviewRef.current) {
      URL.revokeObjectURL(photoPreviewRef.current)
      photoPreviewRef.current = ''
    }
    setPhotoPreview('')
  }

  const stats = useMemo(() => {
    const isPersonal = [ROLES.DEVELOPER, ROLES.QA_ENGINEER].includes(currentUser.role)
    const tasks = isPersonal
      ? getPersonalTasks(state, currentUser)
      : getVisibleTasks(state, currentUser)
    const projects = getVisibleProjects(state, currentUser)
    const bugs = getVisibleBugs(state, currentUser)
    return {
      completedTasks: tasks.filter((task) => task.status === TASK_STATUSES.COMPLETED).length,
      activeProjects: projects.filter(
        (project) => project.status !== PROJECT_STATUSES.COMPLETED,
      ).length,
      openDefects: bugs.filter((bug) => bug.status !== BUG_STATUSES.VERIFIED).length,
    }
  }, [state, currentUser])

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  function handleReset() {
    setForm({
      name: currentUser.name,
      title: currentUser.title,
      phone: currentUser.phone,
      location: currentUser.location,
      bio: currentUser.bio,
      avatarColor: currentUser.avatarColor,
    })
    setError('')
    notify('Unsaved profile changes were discarded.', { type: 'info' })
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Your full name is required.')
      return
    }

    updateUserProfile(currentUser.id, {
      name: form.name.trim(),
      title: form.title.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      bio: form.bio.trim(),
      avatarColor: form.avatarColor,
    })
    notify('Your profile details have been updated.', {
      type: 'success',
      title: 'Profile saved',
    })
  }

  function handlePhotoSelect(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoError('')
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Profile photos must be 5 MB or smaller.')
      event.target.value = ''
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.')
      event.target.value = ''
      return
    }
    clearPhotoPreview()
    photoPreviewRef.current = URL.createObjectURL(file)
    setPhotoPreview(photoPreviewRef.current)
    setPhotoFile(file)
  }

  async function handlePhotoSave() {
    if (!photoFile) return
    setPhotoBusy(true)
    setPhotoError('')
    try {
      const result = await uploadProfilePhoto(photoFile)
      setPhotoFile(null)
      clearPhotoPreview()
      if (photoInputRef.current) photoInputRef.current.value = ''
      notify(
        result.cleanupWarning
          ? 'Your photo was updated, but the previous stored photo needs cleanup.'
          : 'Your profile photo has been updated.',
        { type: result.cleanupWarning ? 'warning' : 'success' },
      )
    } catch (requestError) {
      setPhotoError(
        getApiErrorMessage(requestError, 'The profile photo could not be saved. Try again.'),
      )
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handlePhotoRemove() {
    setPhotoBusy(true)
    setPhotoError('')
    try {
      const result = await removeProfilePhoto()
      setRemovePhotoOpen(false)
      setPhotoFile(null)
      clearPhotoPreview()
      if (photoInputRef.current) photoInputRef.current.value = ''
      if (result.cleanupWarning) {
        setPhotoError('The photo was removed from your profile, but storage cleanup failed.')
      } else {
        notify('Your profile photo has been removed.', { type: 'success' })
      }
    } catch (requestError) {
      setRemovePhotoOpen(false)
      setPhotoError(
        getApiErrorMessage(requestError, 'The profile photo could not be removed. Try again.'),
      )
    } finally {
      setPhotoBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Account · Personal details"
        title="My profile"
        description="Update how your name, role context, and contact details appear across the demo workspace."
        actions={<span className="badge badge--primary">{ROLE_LABELS[currentUser.role]}</span>}
      />

      <div className="profile-layout">
        <section className="panel profile-card">
          <Avatar
            className="profile-avatar"
            name={form.name || currentUser.name}
            userId={currentUser.id}
            hasPhoto={currentUser.profileImageAvailable}
            photoVersion={currentUser.profilePhotoVersion}
            photoUrl={photoPreview}
            color={form.avatarColor}
            title={form.name || currentUser.name}
          />
          <h2 className="profile-name">{form.name || currentUser.name}</h2>
          <p className="profile-role">
            {form.title || currentUser.title} · {ROLE_LABELS[currentUser.role]}
          </p>

          <div className="profile-meta-list">
            <div className="profile-meta">
              <Mail size={14} aria-hidden="true" />
              <span>{currentUser.email}</span>
            </div>
            <div className="profile-meta">
              <Building2 size={14} aria-hidden="true" />
              <span>{currentUser.department}</span>
            </div>
            <div className="profile-meta">
              <MapPin size={14} aria-hidden="true" />
              <span>{form.location || 'Location not set'}</span>
            </div>
            <div className="profile-meta">
              <CalendarDays size={14} aria-hidden="true" />
              <span>Joined {formatDate(currentUser.joinedAt)}</span>
            </div>
          </div>

          <div className="profile-stat-grid">
            <div className="profile-stat">
              <strong>{stats.completedTasks}</strong>
              <span>Completed tasks</span>
            </div>
            <div className="profile-stat">
              <strong>{stats.activeProjects}</strong>
              <span>Active projects</span>
            </div>
            <div className="profile-stat">
              <strong>{stats.openDefects}</strong>
              <span>Open defects</span>
            </div>
          </div>
        </section>

        <form className="panel profile-form-panel" onSubmit={handleSubmit} noValidate>
          <div className="profile-form-panel__header">
            <h2 className="profile-form-panel__title">Profile details</h2>
            <p className="profile-form-panel__subtitle">
            Profile details remain browser-based in this demo. Profile photos are stored securely.
            </p>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">Full name</span>
              <input
                className="input"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Your full name"
                required
              />
              {error ? <span className="form-error">{error}</span> : null}
            </label>

            <label className="form-field">
              <span className="form-label">Job title</span>
              <input
                className="input"
                value={form.title}
                onChange={(event) => handleChange('title', event.target.value)}
                placeholder="e.g. Senior Frontend Developer"
              />
            </label>

            <label className="form-field">
              <span className="form-label">Email address</span>
              <span className="input-group">
                <Mail size={15} aria-hidden="true" />
                <input className="input" value={currentUser.email} disabled />
              </span>
              <span className="form-hint">Email changes are managed by the Super Admin.</span>
            </label>

            <label className="form-field">
              <span className="form-label">Department</span>
              <span className="input-group">
                <Building2 size={15} aria-hidden="true" />
                <input className="input" value={currentUser.department} disabled />
              </span>
              <span className="form-hint">Department is assigned by the organization.</span>
            </label>

            <label className="form-field">
              <span className="form-label">Phone</span>
              <span className="input-group">
                <Phone size={15} aria-hidden="true" />
                <input
                  className="input"
                  value={form.phone}
                  onChange={(event) => handleChange('phone', event.target.value)}
                  placeholder="Contact number"
                />
              </span>
            </label>

            <label className="form-field">
              <span className="form-label">Location</span>
              <span className="input-group">
                <MapPin size={15} aria-hidden="true" />
                <input
                  className="input"
                  value={form.location}
                  onChange={(event) => handleChange('location', event.target.value)}
                  placeholder="City, country"
                />
              </span>
            </label>

            <label className="form-field form-field--full">
              <span className="form-label">Short bio</span>
              <textarea
                className="textarea"
                value={form.bio}
                onChange={(event) => handleChange('bio', event.target.value)}
                placeholder="Describe your role and focus areas"
                rows={3}
              />
            </label>

            <div className="form-field form-field--full">
              <span className="form-label">Profile photo</span>
              <input
                ref={photoInputRef}
                className="input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                disabled={photoBusy}
                aria-describedby="profile-photo-hint"
              />
              <span id="profile-photo-hint" className="form-hint">
                JPEG, PNG, or WebP; maximum 5 MB.
              </span>
              {photoError ? <span className="form-error" role="alert">{photoError}</span> : null}
              {photoFile ? (
                <p className="form-hint" role="status">
                  Previewing {photoFile.name}
                </p>
              ) : null}
              {photoBusy ? <p className="form-hint" role="status">Saving profile photo…</p> : null}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="primary"
                  icon={currentUser.profileImageAvailable ? Camera : Upload}
                  onClick={handlePhotoSave}
                  disabled={!photoFile || photoBusy}
                >
                  {currentUser.profileImageAvailable ? 'Update photo' : 'Upload photo'}
                </Button>
                {currentUser.profileImageAvailable ? (
                  <Button
                    type="button"
                    variant="danger"
                    icon={Trash2}
                    onClick={() => setRemovePhotoOpen(true)}
                    disabled={photoBusy}
                  >
                    Remove photo
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="form-field form-field--full">
              <span className="form-label">Avatar color</span>
              <div className="color-swatches" role="group" aria-label="Avatar color">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch ${form.avatarColor === color ? 'is-selected' : ''}`.trim()}
                    style={{ backgroundColor: color }}
                    onClick={() => handleChange('avatarColor', color)}
                    aria-label={`Use avatar color ${color}`}
                    aria-pressed={form.avatarColor === color}
                  />
                ))}
              </div>
              <span className="form-hint">
                The avatar color is used behind your initials when no photo is set.
              </span>
            </div>
          </div>

          <div className="form-actions">
            <Button variant="secondary" icon={RotateCcw} onClick={handleReset}>
              Reset changes
            </Button>
            <Button type="submit" variant="primary" icon={Save}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
      <ConfirmDialog
        open={removePhotoOpen}
        onClose={() => setRemovePhotoOpen(false)}
        onConfirm={handlePhotoRemove}
        title="Remove profile photo?"
        message="Your profile will return to initials. This does not change any other profile information."
        confirmLabel="Remove photo"
        busy={photoBusy}
      />
    </>
  )
}

export default ProfilePage
