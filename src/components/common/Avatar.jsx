import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getInitials } from '../../utils/formatters'

export function Avatar({
  name,
  userId,
  hasPhoto,
  photoVersion,
  photoUrl,
  color = '#2563EB',
  size = 'md',
  className = '',
  title,
}) {
  const { getProfilePhoto, isAuthenticated } = useAuth()
  const photoKey = [userId, photoVersion, isAuthenticated, hasPhoto].join(':')
  const [loadedPhoto, setLoadedPhoto] = useState({ key: '', url: '' })
  const loadedPhotoUrl = loadedPhoto.key === photoKey ? loadedPhoto.url : ''
  const classes = ['avatar', size !== 'md' ? `avatar--${size}` : '', className]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    let objectUrl = ''
    const controller = new AbortController()

    if (!userId || !isAuthenticated || hasPhoto === false || photoUrl) {
      return () => controller.abort()
    }

    getProfilePhoto(userId, controller.signal)
      .then((photo) => {
        if (photo && !controller.signal.aborted) {
          objectUrl = URL.createObjectURL(photo)
          setLoadedPhoto({ key: photoKey, url: objectUrl })
        }
      })
      .catch(() => {})

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [getProfilePhoto, hasPhoto, isAuthenticated, photoKey, photoUrl, userId])

  return (
    <span
      className={classes}
      style={{ backgroundColor: color }}
      title={title ?? name}
      aria-label={name}
    >
      {getInitials(name)}
      {photoUrl || loadedPhotoUrl ? (
        <img
          className="avatar__image"
          src={photoUrl || loadedPhotoUrl}
          alt=""
          aria-hidden="true"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : null}
    </span>
  )
}

export function AvatarStack({ users = [], limit = 4 }) {
  const visible = users.slice(0, limit)
  const remaining = users.length - visible.length

  return (
    <div className="avatar-stack" aria-label={`${users.length} team members`}>
      {visible.map((user) => (
        <Avatar
          key={user.id}
          name={user.name}
          userId={user.id}
          color={user.avatarColor}
          size="sm"
        />
      ))}
      {remaining > 0 ? <span className="avatar-stack__more">+{remaining}</span> : null}
    </div>
  )
}

export default Avatar
