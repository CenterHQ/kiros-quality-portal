import { SkeletonTable } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonTable rows={8} cols={6} />
    </div>
  )
}
