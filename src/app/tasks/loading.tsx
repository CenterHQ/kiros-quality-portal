import { Skeleton, SkeletonCard } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-6 w-32" />
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
