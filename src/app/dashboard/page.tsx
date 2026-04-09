import { createServerSupabaseClient } from '@/lib/supabase/server'
import { QA_COLORS, STATUS_COLORS } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const [
    { data: elements },
    { data: tasks },
    { data: compliance },
    { data: profile },
    { data: qipGoals },
    { data: philosophyItems }
  ] = await Promise.all([
    supabase.from('qa_elements').select('*').order('qa_number').order('element_code'),
    supabase.from('tasks').select('*'),
    supabase.from('compliance_items').select('*'),
    supabase.from('profiles').select('*'),
    supabase
      .from('centre_context')
      .select('id, title, content, related_qa, related_element_codes')
      .eq('context_type', 'qip_goal')
      .eq('is_active', true)
      .order('title'),
    supabase
      .from('centre_context')
      .select('title, content')
      .eq('context_type', 'philosophy_principle')
      .eq('is_active', true)
      .limit(5),
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

      {/* QIP Goals Progress */}
      {qipGoals && qipGoals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#470DA8' }}>K</div>
            <h2 className="text-lg font-semibold text-gray-800">QIP Goals Progress</h2>
            <span className="text-xs text-gray-400">({qipGoals.length} goals)</span>
          </div>
          <div className="space-y-3">
            {qipGoals.slice(0, 5).map((goal: any) => {
              const relatedElements = (elements || []).filter((el: any) =>
                goal.related_element_codes?.includes(el.element_code) || goal.related_qa?.includes(el.qa_number)
              )
              const completed = relatedElements.filter((el: any) =>
                ['met', 'meeting', 'exceeding'].includes(el.current_rating) || el.status === 'completed'
              ).length
              const total = relatedElements.length || 1
              const pct = Math.round((completed / total) * 100)
              return (
                <div key={goal.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">{goal.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: '#470DA8' }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Centre Philosophy */}
      {philosophyItems && philosophyItems.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-white rounded-xl shadow-sm p-4 border border-purple-100 mt-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl mt-0.5" style={{ color: '#470DA8' }}>&ldquo;</div>
            <div>
              <div className="text-sm font-medium" style={{ color: '#470DA8' }}>{philosophyItems[Math.floor(Math.random() * philosophyItems.length)]?.title}</div>
              <div className="text-xs text-gray-500 mt-1">{philosophyItems[Math.floor(Math.random() * philosophyItems.length)]?.content?.substring(0, 150)}...</div>
              <div className="text-[10px] text-gray-400 mt-2">K.I.R.O.S Philosophy</div>
            </div>
          </div>
        </div>
      )}

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
