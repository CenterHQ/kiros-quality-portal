import { cn } from "@/lib/utils"

const statusConfig: Record<string, { dot: string; badge: string }> = {
  not_met:          { dot: "bg-red-500",     badge: "bg-red-100 text-red-700" },
  action_required:  { dot: "bg-red-500",     badge: "bg-red-100 text-red-700" },
  overdue:          { dot: "bg-red-500",     badge: "bg-red-100 text-red-700" },
  urgent:           { dot: "bg-red-500",     badge: "bg-red-100 text-red-700" },
  met:              { dot: "bg-green-500",   badge: "bg-green-100 text-green-700" },
  meeting:          { dot: "bg-green-500",   badge: "bg-green-100 text-green-700" },
  completed:        { dot: "bg-green-500",   badge: "bg-green-100 text-green-700" },
  done:             { dot: "bg-green-500",   badge: "bg-green-100 text-green-700" },
  exceeding:        { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  in_progress:      { dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700" },
  scheduled:        { dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700" },
  todo:             { dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-600" },
  pending:          { dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-600" },
  not_started:      { dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-600" },
  cancelled:        { dot: "bg-gray-300",    badge: "bg-gray-100 text-gray-400 line-through" },
}

const defaultConfig = { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600" }

function formatLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface StatusBadgeProps {
  status: string
  size?: "sm" | "default"
  className?: string
}

export function StatusBadge({ status, size = "default", className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? defaultConfig

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
        config.badge,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      {formatLabel(status)}
    </span>
  )
}
