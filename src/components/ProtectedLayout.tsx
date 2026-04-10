import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import { ProfileProvider } from '@/lib/ProfileContext'
import ChatAssistant from '@/components/ChatAssistant'
import Providers from '@/components/Providers'

function canAccessPath(profile: { role: string; allowed_pages?: string[] | null }, pathname: string): boolean {
  if (profile.role === 'admin') return true
  if (!profile.allowed_pages) return true
  return profile.allowed_pages.some(page => pathname === page || pathname.startsWith(page + '/'))
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, notify_comments, notify_status_changes, notify_assignments, allowed_pages, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch badge counts for sidebar navigation
  const [{ count: overdueTaskCount }, { count: pendingChecklistCount }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .lt('due_date', new Date().toISOString().split('T')[0])
      .neq('status', 'done'),
    supabase
      .from('checklist_instances')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress'])
      .lte('due_date', new Date().toISOString().split('T')[0]),
  ])

  const badgeCounts: Record<string, number> = {
    '/tasks': overdueTaskCount || 0,
    '/checklists': pendingChecklistCount || 0,
  }

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  if (pathname && pathname !== '/dashboard' && pathname !== '/' && !canAccessPath(profile, pathname)) {
    redirect('/dashboard')
  }

  return (
    <ProfileProvider profile={profile}>
      <Providers>
        <div className="flex min-h-screen bg-background">
          {/* Desktop sidebar — hidden on mobile */}
          <Sidebar profile={profile} badgeCounts={badgeCounts} />

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile top header + bottom nav */}
            <MobileNav profile={profile} badgeCounts={badgeCounts} />

            {/* Page content with responsive padding */}
            <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto pb-20 md:pb-6">
              <div className="max-w-7xl mx-auto animate-fade-in">
                {children}
              </div>
            </main>
          </div>
        </div>
        <ChatAssistant />
      </Providers>
    </ProfileProvider>
  )
}
