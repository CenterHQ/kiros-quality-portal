import { Skeleton } from "@/components/ui/skeleton"

export default function ChatLoading() {
  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className="w-72 bg-card border-r border-border p-3 space-y-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Messages area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="w-16 h-16 rounded-full mx-auto" />
            <Skeleton className="h-5 w-40 mx-auto" />
            <Skeleton className="h-3 w-56 mx-auto" />
          </div>
        </div>
        {/* Input bar */}
        <div className="border-t border-border p-4">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
