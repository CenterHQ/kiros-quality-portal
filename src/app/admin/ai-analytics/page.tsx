'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'

interface AgentPerf {
  agent_name: string
  total_invocations: number
  avg_quality_score: number
  avg_duration_ms: number
}

interface LearningRow {
  learning_type: string
  confidence: number
  is_active: boolean
}

export default function AiAnalyticsPage() {
  const profile = useProfile()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [totalConvs, setTotalConvs] = useState(0)
  const [todayConvs, setTodayConvs] = useState(0)
  const [weekConvs, setWeekConvs] = useState(0)
  const [totalMessages, setTotalMessages] = useState(0)
  const [agentPerf, setAgentPerf] = useState<AgentPerf[]>([])
  const [learnings, setLearnings] = useState<LearningRow[]>([])

  useEffect(() => {
    loadAnalytics()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAnalytics = async () => {
    setLoading(true)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: total },
      { count: todayCount },
      { count: weekCount },
      { count: msgCount },
      { data: agents },
      { data: learningData },
    ] = await Promise.all([
      supabase.from('chat_conversations').select('id', { count: 'exact', head: true }),
      supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
      supabase.from('ai_agent_performance').select('*'),
      supabase.from('ai_learnings').select('learning_type, confidence, is_active'),
    ])

    setTotalConvs(total || 0)
    setTodayConvs(todayCount || 0)
    setWeekConvs(weekCount || 0)
    setTotalMessages(msgCount || 0)
    setAgentPerf((agents as AgentPerf[] | null) || [])
    setLearnings((learningData as LearningRow[] | null) || [])
    setLoading(false)
  }

  // Compute learning stats
  const activeLearnings = learnings.filter(l => l.is_active)
  const learningsByType: Record<string, number> = {}
  for (const l of activeLearnings) {
    learningsByType[l.learning_type] = (learningsByType[l.learning_type] || 0) + 1
  }
  const avgConfidence = activeLearnings.length > 0
    ? activeLearnings.reduce((sum, l) => sum + l.confidence, 0) / activeLearnings.length
    : 0

  if (!['admin', 'manager'].includes(profile.role)) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">Only admins and managers can view AI analytics.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Overview of Kiros AI usage and performance
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Conversation Stats */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Conversations</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Conversations" value={totalConvs} />
              <StatCard label="Today" value={todayConvs} />
              <StatCard label="This Week" value={weekConvs} />
              <StatCard label="Total Messages" value={totalMessages} />
            </div>
          </div>

          {/* Learning Stats */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Learnings</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Active" value={activeLearnings.length} />
              <StatCard label="Total (All)" value={learnings.length} />
              <StatCard label="Avg Confidence" value={`${Math.round(avgConfidence * 100)}%`} />
              <StatCard label="Types" value={Object.keys(learningsByType).length} />
            </div>
            {Object.keys(learningsByType).length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(learningsByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="bg-card rounded-lg shadow-sm p-3 border border-border">
                    <div className="text-xs text-muted-foreground capitalize">{type.replace(/_/g, ' ')}</div>
                    <div className="text-lg font-bold text-foreground">{count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent Performance */}
          {agentPerf.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Agent Performance</h2>
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Agent</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Invocations</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Avg Quality</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agentPerf.sort((a, b) => b.total_invocations - a.total_invocations).map(agent => (
                      <tr key={agent.agent_name} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground capitalize">{agent.agent_name.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2.5 text-right text-foreground">{agent.total_invocations}</td>
                        <td className="px-4 py-2.5 text-right text-foreground">
                          {agent.avg_quality_score ? `${(agent.avg_quality_score * 100).toFixed(0)}%` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {agent.avg_duration_ms ? `${Math.round(agent.avg_duration_ms)}ms` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
    </div>
  )
}
