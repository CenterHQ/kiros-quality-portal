'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS, type Profile } from '@/lib/types'

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'educator', password: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
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

  const addUser = async () => {
    if (!newUser.email || !newUser.full_name || !newUser.password) return
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
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
      setMessage(`User ${newUser.email} created successfully. They can now log in.`)
      setNewUser({ email: '', full_name: '', role: 'educator', password: '' })
      setShowAdd(false)
      // Wait a moment for the trigger to create the profile
      setTimeout(loadProfiles, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage team access and roles</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-[#6b2fa0] text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
          + Add User
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message}
        </div>
      )}

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
              <input type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none" placeholder="e.g. Annette Ballard" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
              <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none" placeholder="e.g. annette@kiros.com.au" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Temporary Password</label>
              <input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none" placeholder="Temporary password" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none">
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addUser} disabled={loading} className="px-4 py-2 bg-[#6b2fa0] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create User'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#6b2fa0] text-white flex items-center justify-center text-xs font-bold">
                      {p.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{p.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{p.email}</td>
                <td className="px-6 py-3">
                  <select value={p.role} onChange={(e) => updateRole(p.id, e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-[#6b2fa0] outline-none">
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
