'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LayoutDashboard, CheckSquare, ShieldCheck, MessageSquare, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import MobileSidebarContent from './MobileSidebarContent'
import type { Profile } from '@/lib/types'

const bottomTabs = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/checklists', label: 'Checklists', icon: ShieldCheck },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare },
]

export default function MobileNav({ profile, badgeCounts = {} }: { profile: Profile; badgeCounts?: Record<string, number> }) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile top header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-card border-b border-border px-4 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors" aria-label="Open menu">
              <Menu className="size-5 text-foreground" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <MobileSidebarContent profile={profile} badgeCounts={badgeCounts} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">K</div>
            <span className="font-semibold text-sm text-foreground">Kiros</span>
          </div>
        </div>
      </header>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-safe">
        <div className="flex justify-around items-center h-16">
          {bottomTabs.map(tab => {
            const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href))
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] rounded-lg transition-colors relative',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <Icon className={cn('size-5', isActive && 'stroke-[2.5]')} />
                  {(badgeCounts[tab.href] || 0) > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
                      {badgeCounts[tab.href]}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            )
          })}
          <Sheet>
            <SheetTrigger className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] rounded-lg text-muted-foreground transition-colors">
              <Menu className="size-5" />
              <span className="text-[10px] font-medium">More</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl p-0">
              <MobileSidebarContent profile={profile} badgeCounts={badgeCounts} />
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  )
}
