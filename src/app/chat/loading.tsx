export default function ChatLoading() {
  return (
    <div className="flex h-full w-full bg-gray-50 animate-pulse">
      <div className="w-72 bg-white border-r border-gray-200 p-3">
        <div className="h-10 bg-gray-200 rounded-lg mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="h-5 bg-gray-200 rounded w-40 mx-auto mb-2" />
          <div className="h-3 bg-gray-100 rounded w-56 mx-auto" />
        </div>
      </div>
    </div>
  )
}
