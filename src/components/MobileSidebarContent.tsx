'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Building2, MessageSquare, Home,
  ClipboardList, CheckSquare, ShieldCheck, CalendarDays,
  FileText, FolderOpen, FileStack, Scale, FormInput,
  Link2, Activity, BarChart3, HelpCircle,
  GraduationCap, BookOpen, Route, Target, Grid3X3, Award,
  Baby, Clock, Users, Wallet, FileInput, HeartPulse,
  Plug, UserCog, Bell, Tag, Cloud, Brain, Bot, LogOut,
  type LucideIcon,
} from 'lucide-react'

interface NavItem { href: string; label: string; icon: LucideIcon }
interface NavGroup { label: string; items: NavItem[]; showIf?: (p: Profile) => boolean }

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/hub', label: 'Centre Hub', icon: Home },
      { href: '/chat', label: 'Kiros AI Chat', icon: MessageSquare },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/elements', label: 'QA Elements', icon: ClipboardList },
      { href: '/tasks', label: 'Task Board', icon: CheckSquare },
      { href: '/checklists', label: 'Checklists', icon: ShieldCheck },
      { href: '/rostering', label: 'Rostering', icon: CalendarDays },
      { href: '/policies', label: 'Policies', icon: FileText },
      { href: '/compliance', label: 'Compliance', icon: Scale },
      { href: '/documents', label: 'Documents', icon: FolderOpen },
      { href: '/documents/library', label: 'AI Documents', icon: FileStack },
      { href: '/registers', label: 'Registers', icon: FileStack },
      { href: '/forms', label: 'Forms', icon: FormInput },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/activity', label: 'Activity', icon: Activity },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/resources', label: 'Resources', icon: Link2 },
      { href: '/guide', label: 'User Guide', icon: HelpCircle },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/learning', label: 'Learning Hub', icon: GraduationCap },
      { href: '/learning/library', label: 'Module Library', icon: BookOpen },
      { href: '/learning/pathways', label: 'Pathways', icon: Route },
      { href: '/learning/pdp', label: 'My PDP', icon: Target },
      { href: '/learning/matrix', label: 'Training Matrix', icon: Grid3X3 },
      { href: '/learning/certificates', label: 'Certificates', icon: Award },
    ],
  },
  {
    label: 'OWNA',
    items: [
      { href: '/owna/children', label: 'Children & Rooms', icon: Baby },
      { href: '/owna/attendance', label: 'Attendance', icon: Clock },
      { href: '/owna/staff', label: 'Staff', icon: Users },
      { href: '/owna/families', label: 'Families & Billing', icon: Wallet },
      { href: '/owna/enrolments', label: 'Enrolment', icon: FileInput },
      { href: '/owna/health', label: 'Health & Safety', icon: HeartPulse },
    ],
  },
  {
    label: 'Admin',
    showIf: (p) => p.role === 'admin' || p.role === 'manager',
    items: [
      { href: '/ap-dashboard', label: 'AP Dashboard', icon: Building2 },
      { href: '/admin/owna', label: 'OWNA API', icon: Plug },
      { href: '/admin/users', label: 'Users', icon: UserCog },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/tags', label: 'Tags', icon: Tag },
      { href: '/admin/sharepoint', label: 'SharePoint', icon: Cloud },
      { href: '/admin/context', label: 'AI Context', icon: Brain },
      { href: '/admin/agents', label: 'AI Agents', icon: Bot },
    ],
  },
]

function canAccessPage(profile: Profile, href: string): boolean {
  if (profile.role === 'admin') return true
  if (!profile.allowed_pages) return true
  return profile.allowed_pages.includes(href)
}

export default function MobileSidebarContent({ profile, badgeCounts = {} }: { profile: Profile; badgeCounts?: Record<string, number> }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* User info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
            {profile.full_name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role] || profile.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navGroups.map(group => {
          if (group.showIf && !group.showIf(profile)) return null
          const visibleItems = group.items.filter(item => canAccessPage(profile, item.href))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label}>
              <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </p>
              {visibleItems.map(item => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" />
                    <span>{item.label}</span>
                    {(badgeCounts[item.href] || 0) > 0 && (
                      <span className="ml-auto min-w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center px-1">
                        {badgeCounts[item.href]}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-2 border-t border-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="size-[18px]" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
