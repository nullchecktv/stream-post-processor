import { createContext, useContext, useState, type ReactNode, useCallback } from 'react'
import { ToastContainer, type ToastMessage } from '../components/common/ToastContainer'
import { type ToastType } from '../components/common/Toast'

interface ToastContextType {
  showToast: (message: string, type: ToastType, onAction?: () => void) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
  showWarning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: ToastType, onAction?: () => void) => {
    const id = `${Date.now()}-${Math.random()}`
    console.log(message, type, onAction, id);
    // setToasts((prev) => [...prev, { id, message, type, onAction }])
  }, [])

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success')
  }, [showToast])

  const showError = useCallback((message: string) => {
    showToast(message, 'error')
  }, [showToast])

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info')
  }, [showToast])

  const showWarning = useCallback((message: string) => {
    showToast(message, 'warning')
  }, [showToast])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider
      value={{ showToast, showSuccess, showError, showInfo, showWarning }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
