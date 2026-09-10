import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { STUDENT_NAV } from '@/lib/navigation'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'student') redirect('/login')
  if (profile.status !== 'approved') redirect('/pending')

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <AppHeader
        title="Hostel Manager"
        subtitle="Student Dashboard"
        userName={profile.full_name || 'Student'}
        navItems={STUDENT_NAV}
      />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <BottomNav items={STUDENT_NAV} />
    </div>
  )
}
