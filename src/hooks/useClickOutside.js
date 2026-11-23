import { useEffect } from 'react'

export function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined

    function handlePointerDown(event) {
      if (!ref.current || ref.current.contains(event.target)) return
      handler(event)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [ref, handler, active])
}

export default useClickOutside
