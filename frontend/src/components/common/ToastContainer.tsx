import { Toast, type ToastType } from './Toast'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
  onAction?: () => void
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
          onAction={toast.onAction}
        />
      ))}
    </div>
  )
}
