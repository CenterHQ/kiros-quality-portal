import { createServerSupabaseClient } from '@/lib/supabase/server'
import { QA_COLORS, STATUS_COLORS } from '@/lib/types'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { QABadge } from '@/components/ui/qa-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Dashboard"
        description="Quality Uplift Progress — Kiros Early Education"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <StatCard
          title="Overall Rating"
          value="Working Towards"
          description="National Quality Standard"
          className="border-red-200"
        />
        <StatCard
          title="Elements Not Met"
          value={notMetCount}
          description={`of ${totalElements} elements`}
          trend={notMetCount > 0 ? { value: `${notMetCount} remaining`, positive: false } : undefined}
        />
        <StatCard
          title="Tasks Completed"
          value={completedTasks}
          description={`of ${totalTasks} tasks`}
          trend={totalTasks > 0 ? { value: `${Math.round((completedTasks / totalTasks) * 100)}%`, positive: completedTasks > 0 } : undefined}
        />
        <StatCard
          title="Compliance Actions"
          value={complianceActions}
          description="requiring attention"
          trend={complianceActions > 0 ? { value: `${complianceActions} open`, positive: false } : undefined}
        />
      </div>

      {/* QIP Goals Progress */}
      {qipGoals && qipGoals.length > 0 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-primary">K</div>
              <CardTitle>QIP Goals Progress</CardTitle>
              <span className="text-xs text-muted-foreground">({qipGoals.length} goals)</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
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
                    <div className="text-sm font-medium text-foreground truncate">{goal.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Centre Philosophy */}
      {philosophyItems && philosophyItems.length > 0 && (
        <Card className="animate-fade-in bg-primary/5 border-primary/20">
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="text-2xl mt-0.5 text-primary">&ldquo;</div>
              <div>
                <div className="text-sm font-medium text-primary">{philosophyItems[Math.floor(Math.random() * philosophyItems.length)]?.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{philosophyItems[Math.floor(Math.random() * philosophyItems.length)]?.content?.substring(0, 150)}...</div>
                <div className="text-xs text-muted-foreground/60 mt-2">K.I.R.O.S Philosophy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QA Overview */}
      <Card className="animate-fade-in">
        <CardHeader className="border-b">
          <CardTitle>Quality Area Overview</CardTitle>
        </CardHeader>
        <div className="divide-y divide-border">
          {Object.entries(qaGroups).map(([qaNum, qaVal]) => {
            const qa = qaVal as { name: string; elements: any[] }
            const num = parseInt(qaNum)
            const notMet = qa.elements.filter((e: any) => e.current_rating === 'not_met').length
            const met = qa.elements.filter((e: any) => e.current_rating === 'met').length
            return (
              <a key={qaNum} href={`/elements?qa=${qaNum}`} className="flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition-colors">
                <QABadge qaNumber={num} showLabel size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{qa.name}</p>
                  <p className="text-xs text-muted-foreground">{qa.elements.length} elements</p>
                </div>
                <div className="flex gap-2">
                  {notMet > 0 && (
                    <StatusBadge status="not_met" size="sm" />
                  )}
                  {met > 0 && (
                    <StatusBadge status="met" size="sm" />
                  )}
                </div>
              </a>
            )
          })}
        </div>
      </Card>

      {/* Compliance Breaches */}
      <Card className="animate-fade-in">
        <CardHeader className="border-b">
          <CardTitle>Compliance Breaches</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Regulation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {compliance?.map(item => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{item.regulation}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.description}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
