import type { Toast } from '../../state/toastContext.ts'
import './Notices.css'

interface ToastRegionProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  return (
    <div className={`toast toast--${toast.tone}`}>
      <p className="toast__message">{toast.message}</p>
      <button type="button" className="toast__dismiss" onClick={() => onDismiss(toast.id)}>
        <span aria-hidden="true">×</span>
        <span className="visually-hidden">Dismiss message</span>
      </button>
    </div>
  )
}

/** Both live regions stay mounted so screen readers announce new messages. */
export function ToastRegion({ toasts, onDismiss }: ToastRegionProps) {
  return (
    <div className="toast-region">
      <div aria-live="polite" className="toast-region__stack">
        {toasts
          .filter((toast) => toast.tone === 'info')
          .map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
      </div>
      <div role="alert" className="toast-region__stack">
        {toasts
          .filter((toast) => toast.tone === 'error')
          .map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
      </div>
    </div>
  )
}
