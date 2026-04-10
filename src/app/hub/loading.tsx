import { Skeleton, SkeletonCard } from "@/components/ui/skeleton"

export default function HubLoading() {
  return (
    <div className="max-w-5xl mx-auto">
      <Skeleton className="rounded-2xl h-40 w-full mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
