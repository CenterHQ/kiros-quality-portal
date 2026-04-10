import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton"

export default function APDashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonTable rows={5} cols={4} />
    </div>
  )
}
