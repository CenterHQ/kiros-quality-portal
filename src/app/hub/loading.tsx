export default function HubLoading() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="rounded-2xl h-40 bg-gradient-to-r from-purple-200 to-purple-100 mb-6" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-36 mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="h-3 bg-gray-100 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
