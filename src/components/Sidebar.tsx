'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

const apItems = [
  { href: '/ap-dashboard', label: 'AP Dashboard', icon: '🏢' },
  { href: '/hub', label: 'Centre Hub', icon: '🏠' },
  { href: '/chat', label: 'Kiros AI Chat', icon: '💬' },
]

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/elements', label: 'QA Elements', icon: '📋' },
  { href: '/tasks', label: 'Task Board', icon: '✅' },
  { href: '/checklists', label: 'Checklists', icon: '🛡️' },
  { href: '/rostering', label: 'Rostering', icon: '📅' },
  { href: '/policies', label: 'Policies', icon: '📄' },
  { href: '/registers', label: 'Registers', icon: '🗂️' },
  { href: '/documents', label: 'Documents', icon: '📁' },
  { href: '/compliance', label: 'Compliance', icon: '⚖️' },
  { href: '/forms', label: 'Forms', icon: '📝' },
  { href: '/resources', label: 'Resources', icon: '🔗' },
  { href: '/activity', label: 'Activity', icon: '📰' },
  { href: '/reports', label: 'Reports', icon: '📈' },
  { href: '/guide', label: 'User Guide', icon: '❓' },
]

const learningItems = [
  { href: '/learning', label: 'Learning Hub', icon: '🎓' },
  { href: '/learning/library', label: 'Module Library', icon: '📖' },
  { href: '/learning/pathways', label: 'Pathways', icon: '🛤️' },
  { href: '/learning/pdp', label: 'My PDP', icon: '🎯' },
  { href: '/learning/matrix', label: 'Training Matrix', icon: '📊' },
  { href: '/learning/certificates', label: 'Certificates', icon: '🏅' },
]

const ownaItems = [
  { href: '/owna/children', label: 'Children & Rooms', icon: '👶' },
  { href: '/owna/attendance', label: 'Attendance', icon: '📋' },
  { href: '/owna/staff', label: 'Staff', icon: '👩‍🏫' },
  { href: '/owna/families', label: 'Families & Billing', icon: '👨‍👩‍👧' },
  { href: '/owna/enrolments', label: 'Enrolment Pipeline', icon: '📝' },
  { href: '/owna/health', label: 'Health & Safety', icon: '🩹' },
]

const adminItems = [
  { href: '/admin/owna', label: 'OWNA API Testing', icon: '🔌' },
  { href: '/admin/users', label: 'User Management', icon: '👥' },
  { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/admin/tags', label: 'Tags', icon: '🏷️' },
  { href: '/admin/sharepoint', label: 'SharePoint Integration', icon: '📂' },
]

function canAccessPage(profile: Profile, href: string): boolean {
  if (profile.role === 'admin') return true
  if (!profile.allowed_pages) return true
  return profile.allowed_pages.includes(href)
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/learning') return pathname === '/learning'
  return pathname === href || (href !== '/' && pathname.startsWith(href))
}

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filteredNavItems = navItems.filter(item => canAccessPage(profile, item.href))
  const filteredLearningItems = learningItems.filter(item => canAccessPage(profile, item.href))
  const filteredOwnaItems = ownaItems.filter(item => canAccessPage(profile, item.href))
  const filteredAdminItems = adminItems.filter(item => canAccessPage(profile, item.href))

  const renderLink = (item: { href: string; label: string; icon: string }) => {
    const isActive = isActivePath(pathname, item.href)
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
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <img src="/logo.jpg" alt="Kiro's Early Education Centre" className="h-10 w-auto" />
        <div className="mt-1.5 bg-gradient-to-r from-[#470DA8] to-[#6B3FCE] text-white text-xs font-medium px-2 py-0.5 rounded inline-block">
          Quality Uplift Portal
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-gray-200">
        <p className="font-medium text-sm truncate">{profile.full_name}</p>
        <p className="text-xs text-gray-500">{ROLE_LABELS[profile.role] || profile.role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {/* AP Dashboard (admin only), Hub & Chat (all roles) */}
        {apItems.filter(item => {
          if (item.href === '/ap-dashboard') return profile.role === 'admin'
          return canAccessPage(profile, item.href)
        }).map(renderLink)}

        {filteredNavItems.map(renderLink)}

        {/* Learning & Development */}
        {filteredLearningItems.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Learning & Development</p>
            </div>
            {filteredLearningItems.map(renderLink)}
          </>
        )}

        {/* OWNA Integration */}
        {filteredOwnaItems.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">OWNA Integration</p>
            </div>
            {filteredOwnaItems.map(renderLink)}
          </>
        )}

        {(profile.role === 'admin' || profile.role === 'manager') && filteredAdminItems.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
            </div>
            {filteredAdminItems.map(renderLink)}
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
