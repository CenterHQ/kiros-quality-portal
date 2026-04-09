import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

function canAccessPath(profile: { role: string; allowed_pages?: string[] | null }, pathname: string): boolean {
  // Admins always have full access
  if (profile.role === 'admin') return true
  // null/undefined means all pages allowed
  if (!profile.allowed_pages) return true
  // Check if the current path matches any allowed page
  return profile.allowed_pages.some(page => pathname === page || pathname.startsWith(page + '/'))
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Get the current pathname from middleware header
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  // Check page access (skip for dashboard — always allowed)
  if (pathname && pathname !== '/dashboard' && pathname !== '/' && !canAccessPath(profile, pathname)) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
