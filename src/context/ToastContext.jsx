import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ToastViewport } from '../components/common/ToastViewport'

export const ToastContext = createContext(null)

let toastSequence = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId))
    const timer = timers.current.get(toastId)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(toastId)
    }
  }, [])

  const notify = useCallback(
    (message, options = {}) => {
      const id = `toast-${Date.now()}-${(toastSequence += 1)}`
      const toast = {
        id,
        type: options.type ?? 'success',
        title: options.title,
        message,
      }
      setToasts((current) => [...current.slice(-3), toast])

      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id))
        timers.current.delete(id)
      }, options.duration ?? 4200)
      timers.current.set(id, timer)
      return id
    },
    [],
  )

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer))
      activeTimers.clear()
    }
  }, [])

  const value = useMemo(
    () => ({ toasts, notify, dismiss, removeToast: dismiss }),
    [toasts, notify, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export default ToastProvider

export function useToastContext() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used inside a ToastProvider.')
  }
  return context
}
