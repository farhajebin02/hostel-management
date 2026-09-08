import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/login')

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-4 border-b p-4 text-sm">
        <span className="mr-4 font-semibold">Hostel Manager — Admin</span>
        <a href="/admin/pending">Pending Approvals</a>
        <a href="/admin/students">Students</a>
        <a href="/admin/analytics">Prep Analytics</a>
        <a href="/admin/billing">Billing</a>
        <a href="/admin/settings">Settings</a>
        <form action="/logout" method="post" className="ml-auto">
          <button type="submit">Log out</button>
        </form>
      </nav>
      <div className="p-4">{children}</div>
    </div>
  )
}
