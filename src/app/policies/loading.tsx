import { Skeleton, SkeletonTable } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-sm" />
      <SkeletonTable rows={8} cols={4} />
    </div>
  )
}
