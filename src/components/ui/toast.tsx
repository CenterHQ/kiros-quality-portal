'use client'

import * as React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  type: ToastType
  message: string
  description?: string
  duration?: number
  onClose: () => void
}

interface ToastItem extends Omit<ToastProps, 'onClose'> {
  id: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_MAP: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const ACCENT_MAP: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
}

const ICON_COLOR_MAP: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}

const PROGRESS_COLOR_MAP: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

const MAX_VISIBLE = 3
const DEFAULT_DURATION = 5000

// ---------------------------------------------------------------------------
// Toast component
// ---------------------------------------------------------------------------

function Toast({ type, message, description, duration = DEFAULT_DURATION, onClose }: ToastProps) {
  const Icon = ICON_MAP[type]
  const progressRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  // Animate the progress bar via inline animation to match duration exactly
  React.useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.animation = `toast-progress ${duration}ms linear forwards`
    }
  }, [duration])

  return (
    <div
      data-slot="toast"
      role="alert"
      className={cn(
        'pointer-events-auto relative w-80 overflow-hidden rounded-lg border border-l-4 bg-white p-4 shadow-lg animate-slide-in-right',
        ACCENT_MAP[type],
      )}
    >
      {/* Content */}
      <div className="flex items-start gap-3 pr-6">
        <Icon className={cn('mt-0.5 size-5 shrink-0', ICON_COLOR_MAP[type])} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-1 top-1 rounded-md p-2.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
        <div
          ref={progressRef}
          className={cn('h-full w-full origin-left', PROGRESS_COLOR_MAP[type])}
          style={{ transform: 'scaleX(1)' }}
        />
      </div>

      {/* Inline keyframes for progress – only injected once */}
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Context + Provider + Hook
// ---------------------------------------------------------------------------

type ToastFn = (opts: Omit<ToastItem, 'id'>) => void

interface ToastContextValue {
  toast: ToastFn
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const toast: ToastFn = React.useCallback((opts) => {
    const id = crypto.randomUUID()
    setToasts((prev) => {
      const next = [...prev, { ...opts, id }]
      // Keep only the most recent MAX_VISIBLE (FIFO)
      return next.slice(-MAX_VISIBLE)
    })
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = React.useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container – fixed bottom-right, stacks upward */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-3"
      >
        {toasts.map((t) => (
          <Toast
            key={t.id}
            type={t.type}
            message={t.message}
            description={t.description}
            duration={t.duration ?? DEFAULT_DURATION}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider />')
  }
  return ctx
}

export { Toast, ToastProvider, useToast }
