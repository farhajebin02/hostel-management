import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'student') redirect('/login')
  if (profile.status !== 'approved') redirect('/pending')

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-bold text-slate-900">Hostel Manager</span>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <a href="/student" className="hover:text-indigo-600">Meals</a>
            <a href="/student/history" className="hover:text-indigo-600">History</a>
            <a href="/student/profile" className="hover:text-indigo-600">Profile</a>
            <form action="/logout" method="post">
              <button type="submit" className="hover:text-indigo-600">Log out</button>
            </form>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  )
}
