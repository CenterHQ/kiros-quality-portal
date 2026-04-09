import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { ProfileProvider } from '@/lib/ProfileContext'

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
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

  if (pathname && pathname !== '/chat' && !profile.allowed_pages?.includes('/chat')) {
    if (profile.role !== 'admin' && profile.allowed_pages) {
      redirect('/dashboard')
    }
  }

  return (
    <ProfileProvider profile={profile}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar profile={profile} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </ProfileProvider>
  )
}
