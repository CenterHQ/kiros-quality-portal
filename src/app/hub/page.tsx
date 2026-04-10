import { createServerSupabaseClient } from '@/lib/supabase/server'
import { QA_COLORS, ROLE_LABELS } from '@/lib/types'

export default async function CentreHubPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
    : { data: null }

  const [
    { data: philosophy },
    { data: qipGoals },
    { data: elements },
    { data: tasks },
    { data: suggestions },
    { data: activity },
  ] = await Promise.all([
    supabase.from('centre_context').select('title, content').eq('context_type', 'philosophy_principle').eq('is_active', true),
    supabase.from('centre_context').select('id, title, content, related_qa').eq('context_type', 'qip_goal').eq('is_active', true).order('title').limit(5),
    supabase.from('qa_elements').select('qa_number, current_rating, status'),
    supabase.from('tasks').select('status'),
    supabase.from('ai_suggestions').select('id, title, content, suggestion_type, action_type, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('activity_log').select('action, entity_type, created_at, profiles(full_name)')
      .order('created_at', { ascending: false }).limit(10),
  ])

  const roleLabel = ROLE_LABELS[profile?.role || 'educator'] || 'Staff'
  const totalElements = elements?.length || 0
  const metElements = elements?.filter(e => ['met', 'meeting', 'exceeding'].includes(e.current_rating)).length || 0
  const totalTasks = tasks?.length || 0
  const doneTasks = tasks?.filter(t => t.status === 'done').length || 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Philosophy Banner */}
      {philosophy && philosophy.length > 0 && (
        <div className="rounded-2xl p-6 text-white bg-gradient-to-br from-primary via-kiros-purple-light to-kiros-purple-light/70">
          <div className="text-xs uppercase tracking-wider opacity-80 mb-3">K.I.R.O.S Philosophy</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {philosophy.map((p, i) => (
              <div key={i} className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-sm font-bold mb-1">{p.title.split(' ')[0]}</div>
                <div className="text-xs opacity-90 leading-relaxed line-clamp-3">{p.content.substring(0, 100)}...</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Welcome & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
          <p className="text-sm text-muted-foreground">{roleLabel} — {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
          <div className="text-xs text-muted-foreground">Elements Met</div>
          <div className="text-base sm:text-lg font-bold text-green-600">{metElements}/{totalElements}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
          <div className="text-xs text-muted-foreground">Tasks Done</div>
          <div className="text-base sm:text-lg font-bold text-primary">{doneTasks}/{totalTasks}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
          <div className="text-xs text-muted-foreground">QIP Goals</div>
          <div className="text-base sm:text-lg font-bold text-foreground">{qipGoals?.length || 0}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
          <div className="text-xs text-muted-foreground">Pending Ideas</div>
          <div className="text-base sm:text-lg font-bold text-amber-600">{suggestions?.length || 0}</div>
        </div>
      </div>

      {/* Two-column: QIP Goals + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QIP Goals */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: 'hsl(var(--primary))' }}>K</div>
            <h2 className="text-base font-semibold text-foreground">QIP Goals</h2>
          </div>
          <div className="space-y-3">
            {(qipGoals || []).map((goal) => {
              const relatedEls = (elements || []).filter(el => goal.related_qa?.includes(el.qa_number))
              const met = relatedEls.filter(el => ['met', 'meeting', 'exceeding'].includes(el.current_rating)).length
              const pct = relatedEls.length > 0 ? Math.round((met / relatedEls.length) * 100) : 0
              return (
                <div key={goal.id} className="py-2 border-b border-border last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground font-medium">{goal.title}</span>
                    <div className="flex gap-1">
                      {goal.related_qa?.map((qa: number) => (
                        <span key={qa} className="text-[9px] px-1 py-0.5 rounded text-white flex-shrink-0" style={{ backgroundColor: QA_COLORS[qa] }}>QA{qa}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'hsl(var(--primary))' }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
          <a href="/elements" className="block mt-3 text-xs text-purple-600 hover:text-purple-800 font-medium">
            View all QA Elements &rarr;
          </a>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <h2 className="text-base font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/tasks" aria-label="Go to Task Board" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted hover:bg-accent transition-colors text-sm text-foreground focus:ring-2 focus:ring-purple-300 focus:outline-none">
              <span>✅</span> <span>Task Board</span>
            </a>
            <a href="/checklists" aria-label="Go to Daily Checklists" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted hover:bg-accent transition-colors text-sm text-foreground focus:ring-2 focus:ring-purple-300 focus:outline-none">
              <span>🛡️</span> <span>Daily Checklists</span>
            </a>
            <a href="/learning" aria-label="Go to Learning Hub" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted hover:bg-accent transition-colors text-sm text-foreground focus:ring-2 focus:ring-purple-300 focus:outline-none">
              <span>🎓</span> <span>Learning Hub</span>
            </a>
            <a href="/compliance" aria-label="Go to Compliance" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted hover:bg-accent transition-colors text-sm text-foreground focus:ring-2 focus:ring-purple-300 focus:outline-none">
              <span>⚖️</span> <span>Compliance</span>
            </a>
            <a href="/policies" aria-label="Go to Policies" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted hover:bg-accent transition-colors text-sm text-foreground focus:ring-2 focus:ring-purple-300 focus:outline-none">
              <span>📄</span> <span>Policies</span>
            </a>
            {profile?.role === 'admin' && (
              <a href="/ap-dashboard" aria-label="Go to AP Dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-sm text-primary focus:ring-2 focus:ring-purple-300 focus:outline-none">
                <span>🏢</span> <span>AP Dashboard</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
        <h2 className="text-base font-semibold text-foreground mb-3">Recent Activity</h2>
        <div className="space-y-2">
          {(activity || []).map((act: Record<string, unknown>, i: number) => (
            <div key={i} className="flex items-start gap-3 py-1.5 border-b border-border last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-300 mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{(act.profiles as Record<string, string> | null)?.full_name || 'System'}</span>
                  {' '}{act.action as string}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(act.created_at as string).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              </div>
            </div>
          ))}
          {(!activity || activity.length === 0) && (
            <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  )
}
