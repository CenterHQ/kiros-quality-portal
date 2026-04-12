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
  Plug, UserCog, Bell, Tag, Cloud, Brain,
  PanelLeftClose, PanelLeftOpen, LogOut, ChevronDown,
  Megaphone, PenSquare, Star, BadgeDollarSign, TrendingUp, Bot,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'

// ─── Nav Configuration ────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
  adminOnly?: boolean
  showIf?: (profile: Profile) => boolean
}

const apItems: NavItem[] = [
  { href: '/ap-dashboard', label: 'AP Dashboard', icon: Building2 },
  { href: '/hub', label: 'Centre Hub', icon: Home },
  { href: '/chat', label: 'Kiros AI Chat', icon: MessageSquare },
]

const navGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/elements', label: 'QA Elements', icon: ClipboardList },
      { href: '/tasks', label: 'Task Board', icon: CheckSquare },
      { href: '/checklists', label: 'Checklists', icon: ShieldCheck },
      { href: '/rostering', label: 'Rostering', icon: CalendarDays },
    ],
  },
  {
    label: 'Quality',
    items: [
      { href: '/policies', label: 'Policies', icon: FileText },
      { href: '/compliance', label: 'Compliance', icon: Scale },
      { href: '/documents', label: 'Documents', icon: FolderOpen },
      { href: '/registers', label: 'Registers', icon: FileStack },
      { href: '/forms', label: 'Forms', icon: FormInput },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/activity', label: 'Activity', icon: Activity },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/reports/extract', label: 'Data Extract', icon: FileStack },
      { href: '/resources', label: 'Resources', icon: Link2 },
      { href: '/guide', label: 'User Guide', icon: HelpCircle },
    ],
  },
  {
    label: 'Learning & Development',
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
    label: 'OWNA Integration',
    items: [
      { href: '/owna/children', label: 'Children & Rooms', icon: Baby },
      { href: '/owna/attendance', label: 'Attendance', icon: Clock },
      { href: '/owna/staff', label: 'Staff', icon: Users },
      { href: '/owna/families', label: 'Families & Billing', icon: Wallet },
      { href: '/owna/enrolments', label: 'Enrolment Pipeline', icon: FileInput },
      { href: '/owna/health', label: 'Health & Safety', icon: HeartPulse },
    ],
  },
  {
    label: 'Marketing',
    showIf: (p) => ['admin', 'manager', 'ns'].includes(p.role),
    items: [
      { href: '/marketing', label: 'Marketing Hub', icon: Megaphone },
      { href: '/marketing/content', label: 'Content', icon: PenSquare },
      { href: '/marketing/feed', label: 'Post Feed', icon: FileStack },
      { href: '/marketing/inbox', label: 'Inbox', icon: MessageSquare },
      { href: '/marketing/comments', label: 'Comments', icon: MessageSquare },
      { href: '/marketing/calendar', label: 'Calendar', icon: CalendarDays },
      { href: '/marketing/reviews', label: 'Reviews', icon: Star },
      { href: '/marketing/ads', label: 'Ads', icon: BadgeDollarSign },
      { href: '/marketing/analytics', label: 'Analytics', icon: TrendingUp },
      { href: '/marketing/chat', label: 'Marketing AI', icon: Bot },
      { href: '/marketing/settings', label: 'Settings', icon: Plug },
    ],
  },
  {
    label: 'Admin',
    adminOnly: true,
    showIf: (p) => p.role === 'admin' || p.role === 'manager',
    items: [
      { href: '/admin/owna', label: 'OWNA API', icon: Plug },
      { href: '/admin/users', label: 'User Management', icon: UserCog },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/tags', label: 'Tags', icon: Tag },
      { href: '/admin/sharepoint', label: 'SharePoint', icon: Cloud },
      { href: '/admin/context', label: 'AI Context', icon: Brain },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canAccessPage(profile: Profile, href: string): boolean {
  if (profile.role === 'admin') return true
  if (!profile.allowed_pages) return true
  return profile.allowed_pages.includes(href)
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/learning') return pathname === '/learning'
  return pathname === href || (href !== '/' && pathname.startsWith(href))
}

// ─── Sidebar Component ───────────────────────────────────────────────────────

export default function Sidebar({ profile, badgeCounts = {} }: { profile: Profile; badgeCounts?: Record<string, number> }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const filteredApItems = apItems.filter(item => {
    if (item.href === '/ap-dashboard') return profile.role === 'admin'
    return canAccessPage(profile, item.href)
  })

  const renderNavItem = (item: NavItem) => {
    const isActive = isActivePath(pathname, item.href)
    const Icon = item.icon
    const badgeCount = badgeCounts[item.href] || 0

    const linkContent = (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
          collapsed ? 'justify-center px-2 py-2.5 relative' : 'px-3 py-2',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className={cn('shrink-0', collapsed ? 'size-5' : 'size-[18px]', !isActive && 'text-kiros-purple/50')} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {badgeCount > 0 && !collapsed && (
          <span className="ml-auto min-w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center px-1">
            {badgeCount}
          </span>
        )}
        {badgeCount > 0 && collapsed && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-0.5">
            {badgeCount}
          </span>
        )}
      </Link>
    )

    return linkContent
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-card border-r border-border transition-all duration-200 shrink-0',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('border-b border-border shrink-0', collapsed ? 'p-2' : 'p-4')}>
        {collapsed ? (
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto">
            K
          </div>
        ) : (
          <>
            <img src="/logo.jpg" alt="Kiro's Early Education Centre" className="h-10 w-auto" />
            <div className="mt-1.5 bg-gradient-to-r from-primary to-kiros-purple-light text-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded inline-block">
              Quality Uplift Portal
            </div>
          </>
        )}
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="p-4 border-b border-border shrink-0">
          <p className="font-medium text-sm truncate text-foreground">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role] || profile.role}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* AP / Priority items */}
        {filteredApItems.map(renderNavItem)}

        {filteredApItems.length > 0 && <div className="my-2 border-t border-border" />}

        {/* Grouped navigation */}
        {navGroups.map(group => {
          if (group.showIf && !group.showIf(profile)) return null
          const visibleItems = group.items.filter(item => canAccessPage(profile, item.href))
          if (visibleItems.length === 0) return null
          const isExpanded = expandedGroups.has(group.label)

          return (
            <div key={group.label}>
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-3 pt-4 pb-1 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-[3px] h-3.5 rounded-full bg-kiros-purple/30" />
                    <p className="text-[11px] font-bold text-kiros-purple/70 uppercase tracking-wider">
                      {group.label}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'size-3.5 text-kiros-purple/40 transition-transform duration-200',
                      !isExpanded && '-rotate-90'
                    )}
                  />
                </button>
              ) : (
                <div className="my-2 border-t border-border" />
              )}
              {(collapsed || isExpanded) && (
                <div className="space-y-0.5">
                  {visibleItems.map(renderNavItem)}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle + Sign out */}
      <div className="border-t border-border p-2 shrink-0 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
          )}
        >
          <LogOut className="size-[18px]" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
