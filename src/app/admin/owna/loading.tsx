import { Skeleton, SkeletonCard } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCard />
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    </div>
  )
}
