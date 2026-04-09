import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { ProfileProvider } from '@/lib/ProfileContext'
import ChatAssistant from '@/components/ChatAssistant'

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

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  if (pathname && pathname !== '/dashboard' && pathname !== '/' && !canAccessPath(profile, pathname)) {
    redirect('/dashboard')
  }

  return (
    <ProfileProvider profile={profile}>
      <div className="flex min-h-screen">
        <Sidebar profile={profile} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      <ChatAssistant />
    </ProfileProvider>
  )
}
