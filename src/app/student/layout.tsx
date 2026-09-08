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
    <div>
      <nav className="flex items-center justify-between border-b p-4">
        <span className="font-semibold">Hostel Manager</span>
        <div className="flex items-center gap-4 text-sm">
          <a href="/student">Today&apos;s Ticks</a>
          <a href="/student/profile">My Profile</a>
          <form action="/logout" method="post">
            <button type="submit">Log out</button>
          </form>
        </div>
      </nav>
      <div className="p-4">{children}</div>
    </div>
  )
}
