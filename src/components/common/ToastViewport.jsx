import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export function ToastViewport({ toasts, onDismiss }) {
  if (!toasts.length) return null

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.type] ?? Info
        return (
          <div className={`toast toast--${toast.type}`} key={toast.id} role="status">
            <span className="toast__icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <div className="toast__body">
              {toast.title ? <p className="toast__title">{toast.title}</p> : null}
              <p className="toast__message">{toast.message}</p>
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default ToastViewport
