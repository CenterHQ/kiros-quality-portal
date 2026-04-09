export default function APDashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
        <div>
          <div className="h-7 bg-gray-200 rounded-lg w-64" />
          <div className="h-4 bg-gray-100 rounded w-48 mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
            <div className="h-7 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-2 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-gray-100 rounded" />
              <div className="w-32 h-2 bg-gray-100 rounded-full" />
              <div className="w-8 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-64" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-64" />
      </div>
    </div>
  )
}
