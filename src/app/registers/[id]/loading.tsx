import { Skeleton, SkeletonTable } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      <SkeletonTable rows={8} cols={5} />
    </div>
  )
}
