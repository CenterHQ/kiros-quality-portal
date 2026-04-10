'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS, ALL_APP_PAGES, type Profile } from '@/lib/types'

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'educator', password: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setProfiles(data)
  }

  useEffect(() => { loadProfiles() }, [])

  const updateRole = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole as Profile['role'] } : p))
  }

  const DEFAULT_NEW_USER_PAGES = [
    '/dashboard',
    '/learning',
    '/learning/library',
    '/learning/pathways',
    '/learning/pdp',
    '/learning/matrix',
    '/learning/certificates',
  ]

  const addUser = async () => {
    if (!newUser.email || !newUser.full_name || !newUser.password) return
    setLoading(true)
    setMessage('')

    const { error, data: signUpData } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: {
        data: {
          full_name: newUser.full_name,
          role: newUser.role,
        }
      }
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      // Wait for the profile trigger to create the profile, then set default page permissions
      const userId = signUpData.user?.id
      if (userId) {
        // Retry until the profile exists (trigger may take a moment)
        const setDefaults = async (retries = 5) => {
          const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single()
          if (profile) {
            await supabase.from('profiles').update({
              allowed_pages: newUser.role === 'admin' ? null : DEFAULT_NEW_USER_PAGES
            }).eq('id', userId)
          } else if (retries > 0) {
            setTimeout(() => setDefaults(retries - 1), 1000)
          }
        }
        setTimeout(() => setDefaults(), 1500)
      }
      setMessage(`User ${newUser.email} created successfully with Learning & Development access. Add more pages below.`)
      setNewUser({ email: '', full_name: '', role: 'educator', password: '' })
      setShowAdd(false)
      setTimeout(loadProfiles, 3000)
    }
    setLoading(false)
  }

  const hasPage = (profile: Profile, href: string): boolean => {
    // null/undefined means all pages allowed
    if (!profile.allowed_pages) return true
    return profile.allowed_pages.includes(href)
  }

  const togglePage = (profile: Profile, href: string): string[] => {
    const current = profile.allowed_pages || ALL_APP_PAGES.map(p => p.href)
    if (current.includes(href)) {
      return current.filter(p => p !== href)
    } else {
      return [...current, href]
    }
  }

  const updatePagePermissions = async (userId: string, allowedPages: string[]) => {
    setSaving(userId)
    // If all pages selected, store null (meaning full access)
    const value = allowedPages.length === ALL_APP_PAGES.length ? null : allowedPages
    await supabase.from('profiles').update({ allowed_pages: value }).eq('id', userId)
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, allowed_pages: value } : p))
    setSaving(null)
  }

  const selectAllPages = async (userId: string) => {
    await updatePagePermissions(userId, ALL_APP_PAGES.map(p => p.href))
  }

  const deselectAllPages = async (userId: string) => {
    // Always keep dashboard
    await updatePagePermissions(userId, ['/dashboard'])
  }

  const sections = ['Main', 'Learning', 'OWNA Integration', 'Admin']

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage team access, roles, and page permissions</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition">
          + Add User
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message}
        </div>
      )}

      {showAdd && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">Add New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
              <input type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Annette Ballard" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email</label>
              <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. annette@kiros.com.au" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Temporary Password</label>
              <input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Temporary password" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Role</label>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addUser} disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create User'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-accent">Cancel</button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Pages</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {profiles.map(p => (
              <tr key={p.id} className="group">
                <td colSpan={5} className="p-0">
                  <div className="hover:bg-accent">
                    <div className="flex items-center">
                      <div className="px-6 py-3 w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                            {p.full_name?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-medium text-foreground">{p.full_name}</span>
                        </div>
                      </div>
                      <div className="px-6 py-3 flex-1 text-sm text-gray-600">{p.email}</div>
                      <div className="px-6 py-3 w-[180px]">
                        <select value={p.role} onChange={(e) => updateRole(p.id, e.target.value)}
                          className="px-2 py-1 border border-border rounded text-xs focus:ring-2 focus:ring-primary outline-none">
                          {Object.entries(ROLE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="px-6 py-3 w-[120px]">
                        {p.role === 'admin' ? (
                          <span className="text-xs text-muted-foreground">All (admin)</span>
                        ) : (
                          <button
                            onClick={() => setExpandedUser(expandedUser === p.id ? null : p.id)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {expandedUser === p.id ? 'Close' : (
                              !p.allowed_pages ? 'All pages' : `${p.allowed_pages.length} pages`
                            )}
                          </button>
                        )}
                      </div>
                      <div className="px-6 py-3 w-[100px] text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Expanded Page Permissions */}
                  {expandedUser === p.id && p.role !== 'admin' && (
                    <div className="px-6 pb-4 bg-muted border-t border-border">
                      <div className="flex items-center justify-between py-3">
                        <h4 className="text-sm font-semibold text-foreground">
                          Page Permissions for {p.full_name}
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => selectAllPages(p.id)}
                            className="text-xs px-3 py-1 bg-card border border-border rounded-md hover:bg-accent text-foreground"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => deselectAllPages(p.id)}
                            className="text-xs px-3 py-1 bg-card border border-border rounded-md hover:bg-accent text-foreground"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>
                      {saving === p.id && (
                        <div className="text-xs text-primary mb-2">Saving...</div>
                      )}
                      {sections.map(section => {
                        const sectionPages = ALL_APP_PAGES.filter(pg => pg.section === section)
                        // Hide admin section for non-admin/manager roles
                        if (section === 'Admin' && p.role !== 'manager') return null
                        return (
                          <div key={section} className="mb-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section}</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                              {sectionPages.map(page => (
                                <label
                                  key={page.href}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-card cursor-pointer transition"
                                >
                                  <input
                                    type="checkbox"
                                    checked={hasPage(p, page.href)}
                                    onChange={() => {
                                      const newPages = togglePage(p, page.href)
                                      updatePagePermissions(p.id, newPages)
                                    }}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm text-foreground">{page.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
