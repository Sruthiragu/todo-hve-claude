import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastRegion } from '../components/Notices/ToastRegion.tsx'
import { ToastContext } from './toastContext.ts'
import type { Toast, ToastApi, ToastTone } from './toastContext.ts'

const INFO_TIMEOUT_MS = 4000
const MAX_TOASTS = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      nextId.current += 1
      const id = nextId.current
      setToasts((current) => [...current, { id, message, tone }].slice(-MAX_TOASTS))
      // Errors stay until dismissed; info messages fade on their own.
      if (tone === 'info') timers.current.set(id, window.setTimeout(() => dismiss(id), INFO_TIMEOUT_MS))
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
