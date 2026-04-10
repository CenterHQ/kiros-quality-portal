import { cn } from "@/lib/utils"

const qaColors: Record<number, string> = {
  1: "bg-[#e74c3c]",
  2: "bg-[#e67e22]",
  3: "bg-[#2ecc71]",
  4: "bg-[#3498db]",
  5: "bg-[#9b59b6]",
  6: "bg-[#1abc9c]",
  7: "bg-[#34495e]",
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  default: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
} as const

interface QABadgeProps {
  qaNumber: number
  showLabel?: boolean
  size?: "sm" | "default" | "lg"
  className?: string
}

export function QABadge({ qaNumber, showLabel = false, size = "default", className }: QABadgeProps) {
  const colorClass = qaColors[qaNumber] ?? "bg-gray-500"

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold text-white",
        sizeClasses[size],
        colorClass,
        className,
      )}
    >
      {showLabel ? `QA${qaNumber}` : qaNumber}
    </span>
  )
}
