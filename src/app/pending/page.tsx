import { Card } from '@/components/ui'

export default function PendingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ⏳
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Awaiting approval</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account has been created. A hostel admin needs to review and approve it before you can submit meal ticks.
        </p>
        <form action="/logout" method="post" className="mt-6">
          <button type="submit" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Log out
          </button>
        </form>
      </Card>
    </main>
  )
}
