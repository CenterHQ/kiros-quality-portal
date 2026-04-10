import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-muted rounded-md animate-shimmer",
        className
      )}
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, hsl(var(--muted)) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border p-4 space-y-3",
        className
      )}
    >
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-8 w-1/3" />
    </div>
  )
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 h-12">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3 flex-1", i === 0 && "max-w-[40%]")}
        />
      ))}
    </div>
  )
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-muted flex items-center gap-4 px-4 h-10">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3 flex-1", i === 0 && "max-w-[40%]")}
          />
        ))}
      </div>
      {/* Body */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
      </div>
    </div>
  )
}
