import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

const priorityConfig = {
  low: {
    icon: ArrowDown,
    classes: "bg-gray-100 text-gray-600",
  },
  medium: {
    icon: ArrowRight,
    classes: "bg-blue-100 text-blue-700",
  },
  high: {
    icon: ArrowUp,
    classes: "bg-amber-100 text-amber-700",
  },
  urgent: {
    icon: AlertTriangle,
    classes: "bg-red-100 text-red-700",
  },
} as const

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high" | "urgent"
  showLabel?: boolean
  className?: string
}

export function PriorityBadge({ priority, showLabel = true, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        config.classes,
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {showLabel && <span className="capitalize">{priority}</span>}
    </span>
  )
}
