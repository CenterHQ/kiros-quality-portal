import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ProtectedLayout from '@/components/ProtectedLayout'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager', 'ns'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return <ProtectedLayout>{children}</ProtectedLayout>
}
