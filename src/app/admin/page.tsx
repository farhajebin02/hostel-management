import { Card } from '@/components/ui'

const links = [
  { href: '/admin/pending', title: 'Pending Approvals', desc: 'Review and approve new student sign-ups.' },
  { href: '/admin/students', title: 'Students', desc: 'View, edit, and manage every student profile.' },
  { href: '/admin/analytics', title: 'Prep Analytics', desc: "Tomorrow's breakfast and dinner counts." },
  { href: '/admin/billing', title: 'Billing', desc: 'Monthly mess bill preview and month close.' },
  { href: '/admin/settings', title: 'Settings', desc: 'Daily cutoff time and hostel rent.' },
]

export default function AdminHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Welcome, Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Manage students, review tomorrow&apos;s prep counts, and generate monthly bills.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <a key={l.href} href={l.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <h2 className="font-semibold text-slate-900">{l.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{l.desc}</p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  )
}
