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
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm font-medium text-slate-600">
          <span className="mr-2 font-bold text-slate-900">Hostel Manager <span className="font-normal text-indigo-600">Admin</span></span>
          <a href="/admin/pending" className="hover:text-indigo-600">Pending</a>
          <a href="/admin/students" className="hover:text-indigo-600">Students</a>
          <a href="/admin/analytics" className="hover:text-indigo-600">Prep Analytics</a>
          <a href="/admin/billing" className="hover:text-indigo-600">Billing</a>
          <a href="/admin/settings" className="hover:text-indigo-600">Settings</a>
          <form action="/logout" method="post" className="ml-auto">
            <button type="submit" className="hover:text-indigo-600">Log out</button>
          </form>
        </div>
      </nav>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  )
}
