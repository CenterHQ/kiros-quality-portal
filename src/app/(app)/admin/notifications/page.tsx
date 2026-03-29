'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NotificationsPage() {
  const [settings, setSettings] = useState({ notify_comments: true, notify_status_changes: true, notify_assignments: true })
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('notify_comments, notify_status_changes, notify_assignments').eq('id', user.id).single()
        if (data) setSettings(data)
      }
    }
    load()
  }, [])

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update(settings).eq('id', user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <span className="text-sm text-gray-700">{label}</span>
      <button onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition relative ${checked ? 'bg-[#6b2fa0]' : 'bg-gray-300'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notification Settings</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <Toggle label="Notify me when someone comments on my items" checked={settings.notify_comments} onChange={(v) => setSettings({...settings, notify_comments: v})} />
        <Toggle label="Notify me when an element or task status changes" checked={settings.notify_status_changes} onChange={(v) => setSettings({...settings, notify_status_changes: v})} />
        <Toggle label="Notify me when I am assigned a task or training" checked={settings.notify_assignments} onChange={(v) => setSettings({...settings, notify_assignments: v})} />
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} className="px-4 py-2 bg-[#6b2fa0] text-white rounded-lg text-sm font-medium hover:opacity-90">Save Settings</button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>
    </div>
  )
}
