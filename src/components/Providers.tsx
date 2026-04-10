'use client'

import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/ui/toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={0}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </TooltipProvider>
  )
}
