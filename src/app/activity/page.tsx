'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type ActivityLog, type Profile } from '@/lib/types'

const ENTITY_TYPES = ['element', 'task', 'document', 'training'] as const

const ENTITY_COLORS: Record<string, string> = {
  element: '#3498db',
  task: '#e67e22',
  document: '#2ecc71',
  training: '#9b59b6',
  compliance: '#e74c3c',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [filter, setFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadData()

    // Realtime subscription
    const channel = supabase
      .channel('activity_log_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        async (payload) => {
          const newEntry = payload.new as ActivityLog
          // Fetch the profile for the new entry
          if (newEntry.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newEntry.user_id)
              .single()
            if (profile) {
              newEntry.profiles = profile
            }
          }
          setActivities(prev => {
            if (prev.some(a => a.id === newEntry.id)) return prev
            return [newEntry, ...prev].slice(0, 100)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('activity_log')
      .select('*, profiles(id, full_name, email, role)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) setActivities(data)
    setLoading(false)
  }

  const filtered = filter
    ? activities.filter(a => a.entity_type === filter)
    : activities

  function formatAction(action: string) {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Recent actions and changes across the portal
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-1 mb-6 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            !filter ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          All
        </button>
        {ENTITY_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilter(filter === type ? null : type)}
            className="px-3 py-1 rounded-full text-xs font-medium transition"
            style={
              filter === type
                ? { backgroundColor: ENTITY_COLORS[type], color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#666' }
            }
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {filtered.length > 0 ? (
          <div className="divide-y divide-border">
            {filtered.map(activity => {
              const profile = activity.profiles as unknown as Profile
              const entityColor = ENTITY_COLORS[activity.entity_type || ''] || '#999'

              return (
                <div key={activity.id} className="flex gap-4 px-6 py-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: entityColor }}
                    >
                      {profile?.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {profile?.full_name || 'System'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatAction(activity.action)}
                      </span>
                      {activity.entity_type && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: entityColor }}
                        >
                          {activity.entity_type}
                        </span>
                      )}
                      {activity.entity_id && (
                        <span className="text-xs text-muted-foreground font-mono">
                          #{activity.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    {activity.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.details}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0">
                    <span className="text-xs text-muted-foreground" title={new Date(activity.created_at).toLocaleString()}>
                      {timeAgo(activity.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No activity yet</p>
            <p className="text-sm mt-1">Actions and changes will appear here as they happen.</p>
          </div>
        )}
      </div>
    </div>
  )
}
