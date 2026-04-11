'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PLATFORM_ICONS } from '@/components/marketing/PlatformIcon'
import type { MarketingCalendarEntry } from '@/lib/marketing/types'

const TYPE_COLORS: Record<string, string> = {
  post: 'bg-blue-100 border-blue-300 text-blue-800',
  campaign_start: 'bg-green-100 border-green-300 text-green-800',
  campaign_end: 'bg-red-100 border-red-300 text-red-800',
  event: 'bg-purple-100 border-purple-300 text-purple-800',
  review_reminder: 'bg-amber-100 border-amber-300 text-amber-800',
  report_due: 'bg-gray-100 border-gray-300 text-gray-800',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ContentCalendarPage() {
  const [entries, setEntries] = useState<MarketingCalendarEntry[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    loadEntries()
  }, [year, month])

  async function loadEntries() {
    const supabase = createClient()
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase
      .from('marketing_content_calendar')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('time')
    setEntries(data || [])
    setLoading(false)
  }

  function navigate(delta: number) {
    setCurrentDate(new Date(year, month + delta, 1))
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    // Monday-based week: 0=Mon, 6=Sun
    const startDow = (firstDay.getDay() + 6) % 7
    const daysInMonth = lastDay.getDate()

    const days: { date: number; isCurrentMonth: boolean; dateStr: string }[] = []

    // Padding before
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d.getDate(), isCurrentMonth: false, dateStr: d.toISOString().split('T')[0] })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date: d, isCurrentMonth: true, dateStr })
    }

    // Padding after (fill to 42 cells = 6 rows)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ date: d.getDate(), isCurrentMonth: false, dateStr: d.toISOString().split('T')[0] })
    }

    return days
  }, [year, month])

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Content Calendar"
        description="Plan and schedule your marketing content"
        breadcrumbs={[
          { label: 'Marketing', href: '/marketing' },
          { label: 'Calendar' },
        ]}
        actions={
          <Link
            href="/marketing/content/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="size-4" />
            New Content
          </Link>
        }
      />

      {/* Calendar controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-accent">
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-accent">
            <ChevronRight className="size-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm rounded-lg border border-border hover:bg-accent"
          >
            Today
          </button>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'month' ? 'bg-primary text-white' : 'hover:bg-accent'}`}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'week' ? 'bg-primary text-white' : 'hover:bg-accent'}`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map(day => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayEntries = entries.filter(e => e.date === day.dateStr)
              const isToday = day.dateStr === today

              return (
                <div
                  key={i}
                  className={`min-h-[100px] p-1.5 border-b border-r border-border ${
                    !day.isCurrentMonth ? 'bg-muted/30' : ''
                  } ${isToday ? 'bg-primary/5' : ''}`}
                >
                  <div className={`text-xs mb-1 ${
                    isToday ? 'font-bold text-primary' : day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {day.date}
                  </div>
                  <div className="space-y-0.5">
                    {dayEntries.slice(0, 3).map(entry => (
                      <div
                        key={entry.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] leading-tight truncate border ${TYPE_COLORS[entry.calendar_type] || 'bg-gray-100 border-gray-200'}`}
                        title={entry.title}
                      >
                        <div className="flex items-center gap-0.5">
                          {entry.platforms.slice(0, 2).map(p => (
                            <span key={p}>{PLATFORM_ICONS[p]}</span>
                          ))}
                          <span className="truncate">{entry.title}</span>
                        </div>
                      </div>
                    ))}
                    {dayEntries.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{dayEntries.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
