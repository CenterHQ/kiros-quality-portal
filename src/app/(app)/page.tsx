import { createServerSupabaseClient } from '@/lib/supabase/server'
import { QA_COLORS, STATUS_COLORS } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const [
    { data: elements },
    { data: tasks },
    { data: compliance },
    { data: profile }
  ] = await Promise.all([
    supabase.from('qa_elements').select('*').order('qa_number').order('element_code'),
    supabase.from('tasks').select('*'),
    supabase.from('compliance_items').select('*'),
    supabase.from('profiles').select('*'),
  ])

  const notMetCount = elements?.filter(e => e.current_rating === 'not_met').length || 0
  const metCount = elements?.filter(e => e.current_rating === 'met').length || 0
  const totalElements = elements?.length || 0
  const completedTasks = tasks?.filter(t => t.status === 'done').length || 0
  const totalTasks = tasks?.length || 0
  const complianceActions = compliance?.filter(c => c.status === 'action_required').length || 0

  const qaGroups = elements?.reduce((acc, el) => {
    if (!acc[el.qa_number]) acc[el.qa_number] = { name: el.qa_name, elements: [] }
    acc[el.qa_number].elements.push(el)
    return acc
  }, {} as Record<number, { name: string; elements: any[] }>) || {}

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Quality Uplift Progress — Kiros Early Education</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Overall Rating</p>
          <p className="text-lg font-bold text-red-500 mt-1">Working Towards NQS</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Elements Not Met</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{notMetCount}<span className="text-lg text-gray-400">/{totalElements}</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Tasks Completed</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{completedTasks}<span className="text-lg text-gray-400">/{totalTasks}</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Compliance Actions</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{complianceActions}</p>
        </div>
      </div>

      {/* QA Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Quality Area Overview</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {Object.entries(qaGroups).map(([qaNum, qaVal]) => {
            const qa = qaVal as { name: string; elements: any[] }
            const num = parseInt(qaNum)
            const color = QA_COLORS[num] || '#666'
            const notMet = qa.elements.filter((e: any) => e.current_rating === 'not_met').length
            const met = qa.elements.filter((e: any) => e.current_rating === 'met').length
            return (
              <a key={qaNum} href={`/elements?qa=${qaNum}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: color }}>
                  QA{qaNum}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{qa.name}</p>
                  <p className="text-xs text-gray-500">{qa.elements.length} elements</p>
                </div>
                <div className="flex gap-2">
                  {notMet > 0 && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: STATUS_COLORS.not_met.bg, color: STATUS_COLORS.not_met.text }}>
                      {notMet} Not Met
                    </span>
                  )}
                  {met > 0 && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: STATUS_COLORS.met.bg, color: STATUS_COLORS.met.text }}>
                      {met} Met
                    </span>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      </div>

      {/* Compliance Breaches */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Compliance Breaches</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Regulation</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compliance?.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.regulation}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{item.description}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                      backgroundColor: STATUS_COLORS[item.status]?.bg || '#f8f9fa',
                      color: STATUS_COLORS[item.status]?.text || '#666'
                    }}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
