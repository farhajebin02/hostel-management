import { login } from './actions'
import { Banner, Button, Card, inputClass, labelClass } from '@/components/ui'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Hostel Manager</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to continue</p>
      </div>
      <Card className="w-full max-w-sm">
        {error && (
          <div className="mb-4">
            <Banner tone="error">{error}</Banner>
          </div>
        )}
        <form action={login} className="flex flex-col gap-4">
          <label className={labelClass}>
            Email
            <input name="email" type="email" placeholder="you@example.com" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Password
            <input name="password" type="password" placeholder="••••••••" required className={inputClass} />
          </label>
          <Button type="submit" className="mt-2 w-full">Log in</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          New student?{' '}
          <a href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign up
          </a>
        </p>
      </Card>
    </main>
  )
}
