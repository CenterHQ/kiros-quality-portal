import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCard />
      <SkeletonTable rows={6} cols={4} />
    </div>
  )
}
