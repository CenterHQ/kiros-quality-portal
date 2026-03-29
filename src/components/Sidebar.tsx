'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/elements', label: 'QA Elements', icon: '📋' },
  { href: '/tasks', label: 'Task Board', icon: '✅' },
  { href: '/training', label: 'Training', icon: '📚' },
  { href: '/documents', label: 'Documents', icon: '📁' },
  { href: '/compliance', label: 'Compliance', icon: '⚖️' },
  { href: '/forms', label: 'Forms', icon: '📝' },
  { href: '/resources', label: 'Resources', icon: '🔗' },
  { href: '/activity', label: 'Activity', icon: '📰' },
  { href: '/reports', label: 'Reports', icon: '📈' },
  { href: '/guide', label: 'User Guide', icon: '❓' },
]

const adminItems = [
  { href: '/admin/users', label: 'User Management', icon: '👥' },
  { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/admin/tags', label: 'Tags', icon: '🏷️' },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 bg-gradient-to-r from-[#350A7E] to-[#6B3FCE]">
        <img src="/logo.jpg" alt="Kiros Early Education" className="h-8 brightness-0 invert mb-1" />
        <p className="text-white/70 text-xs">Quality Uplift Portal</p>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-gray-200">
        <p className="font-medium text-sm truncate">{profile.full_name}</p>
        <p className="text-xs text-gray-500">{ROLE_LABELS[profile.role] || profile.role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-[#470DA8] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          )
        })}

        {(profile.role === 'admin' || profile.role === 'manager') && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
            </div>
            {adminItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-[#470DA8] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              )
            })}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
