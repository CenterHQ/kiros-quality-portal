import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchServiceOverview, fetchQipGoalProgress, fetchStaffCompliance, fetchOperationalHealth, fetchPendingSuggestions } from '@/lib/ap-dashboard-data'
import { QA_COLORS, ROLE_LABELS } from '@/lib/types'
import SuggestionReview from './SuggestionReview'
import PrintButton from './PrintButton'

export default async function APDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const [overview, qipGoals, staffCompliance, operations, suggestions] = await Promise.all([
    fetchServiceOverview(supabase),
    fetchQipGoalProgress(supabase),
    fetchStaffCompliance(supabase),
    fetchOperationalHealth(supabase),
    fetchPendingSuggestions(supabase),
  ])

  const overallQipProgress = qipGoals.length > 0
    ? Math.round(qipGoals.reduce((sum, g) => sum + g.progress, 0) / qipGoals.length)
    : 0

  const qaBreakdown = [1, 2, 3, 4, 5, 6, 7].map(qaNum => {
    const qaElements = overview.elements.filter(e => e.qa_number === qaNum)
    const met = qaElements.filter(e => ['met', 'meeting', 'exceeding'].includes(e.current_rating)).length
    const qaGoals = qipGoals.filter(g => g.related_qa?.includes(qaNum))
    return {
      qa: qaNum,
      name: qaElements[0]?.qa_name || `QA${qaNum}`,
      met,
      total: qaElements.length,
      goals: qaGoals.length,
      avgProgress: qaGoals.length > 0 ? Math.round(qaGoals.reduce((s, g) => s + g.progress, 0) / qaGoals.length) : 0,
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approved Provider Dashboard</h1>
          <p className="text-sm text-muted-foreground">Kiros Early Education — Executive Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <PrintButton />
        </div>
      </div>

      {/* Service Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="text-xs text-muted-foreground mb-1">NQS Rating Status</div>
          <div className="text-lg font-bold text-amber-600">Working Towards</div>
          <div className="text-xs text-muted-foreground mt-1">{overview.notMet} elements not met</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Elements Met</div>
          <div className="text-lg font-bold text-green-600">{overview.met} / {overview.total}</div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${overview.total > 0 ? (overview.met / overview.total * 100) : 0}%` }} />
          </div>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="text-xs text-muted-foreground mb-1">QIP Progress</div>
          <div className="text-lg font-bold text-primary">{overallQipProgress}%</div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${overallQipProgress}%` }} />
          </div>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Compliance Alerts</div>
          <div className="text-lg font-bold text-red-600">
            {operations.overdueTasks + operations.overdueActions}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {operations.overdueTasks} tasks + {operations.overdueActions} actions overdue
          </div>
        </div>
      </div>

      {/* QIP Goals Progress */}
      <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-primary">K</div>
          <h2 className="text-lg font-semibold text-foreground">QIP Goals Progress</h2>
          <span className="text-xs text-muted-foreground">({qipGoals.length} goals)</span>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {qipGoals.map((goal) => (
            <div key={goal.id} className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{goal.title}</div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex gap-1">
                    {goal.related_qa?.map((qa: number) => (
                      <span key={qa} className="text-xs px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: QA_COLORS[qa] || '#999' }}>
                        QA{qa}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {goal.elementsMet}/{goal.elementsTotal} elements
                  </span>
                </div>
              </div>
              <div className="w-32 flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all bg-primary" style={{ width: `${goal.progress}%` }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground w-8 text-right">{goal.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: Staff & Training / Operational Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff & Training */}
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Staff & Training</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-green-700">Fully Compliant</div>
              <div className="text-xl font-bold text-green-600">{staffCompliance.fullyCompliant}/{staffCompliance.total}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-red-700">Compliance Gaps</div>
              <div className="text-xl font-bold text-red-600">{staffCompliance.withGaps}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs text-amber-700">Expiring Soon</div>
              <div className="text-xl font-bold text-amber-600">{staffCompliance.expiringSoon}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-700">Total Staff</div>
              <div className="text-xl font-bold text-blue-600">{staffCompliance.total}</div>
            </div>
          </div>
          <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
            {staffCompliance.staff.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50">
                <div>
                  <span className="text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{ROLE_LABELS[s.role] || s.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${s.isFullyCompliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.qualsCurrent}/{s.qualsTotal} quals
                  </span>
                  <span className="text-xs text-muted-foreground">{s.trainingCompleted} trained</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Health */}
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Operational Health</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Checklists Today</div>
              <div className="text-xl font-bold text-foreground">
                {operations.checklistsToday.completed}/{operations.checklistsToday.total}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-red-700">Overdue Items</div>
              <div className="text-xl font-bold text-red-600">{operations.overdueTasks + operations.overdueActions}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs text-amber-700">Open Tickets</div>
              <div className="text-xl font-bold text-amber-600">{operations.openTickets}</div>
            </div>
            <div className={`rounded-lg p-3 ${operations.criticalTickets > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className={`text-xs ${operations.criticalTickets > 0 ? 'text-red-700' : 'text-green-700'}`}>Critical Tickets</div>
              <div className={`text-xl font-bold ${operations.criticalTickets > 0 ? 'text-red-600' : 'text-green-600'}`}>{operations.criticalTickets}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</div>
            {operations.recentActivity.slice(0, 5).map((act: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs py-1 border-b border-border/50">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 flex-shrink-0" />
                <div className="text-muted-foreground">
                  <span className="font-medium">{(act.profiles as Record<string, unknown>)?.full_name as string || 'System'}</span>
                  {' '}{act.action as string}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Area Grid */}
      <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quality Area Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {qaBreakdown.map(qa => (
            <Link key={qa.qa} href={`/elements?qa=${qa.qa}`} className="block rounded-lg border border-border p-4 hover:shadow-md transition-shadow focus:ring-2 focus:ring-ring focus:outline-none">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded text-white font-medium" style={{ backgroundColor: QA_COLORS[qa.qa] || '#999' }}>
                  QA{qa.qa}
                </span>
                <span className="text-xs text-muted-foreground truncate">{qa.name}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{qa.met}/{qa.total} met</span>
                <span className="text-xs text-muted-foreground">{qa.goals} QIP goals</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${qa.total > 0 ? (qa.met / qa.total * 100) : 0}%`, backgroundColor: QA_COLORS[qa.qa] }} />
              </div>
              {qa.goals > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">QIP progress: {qa.avgProgress}%</div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Pending Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Pending Suggestions</h2>
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{suggestions.length}</span>
          </div>
          <SuggestionReview suggestions={suggestions} />
        </div>
      )}
    </div>
  )
}
