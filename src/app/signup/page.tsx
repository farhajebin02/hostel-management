import { signup } from './actions'
import { Banner, Button, Card, inputClass, labelClass } from '@/components/ui'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Hostel Manager</h1>
        <p className="mt-1 text-sm text-slate-500">Create your student account</p>
      </div>
      <Card className="w-full max-w-sm">
        {error && (
          <div className="mb-4">
            <Banner tone="error">{error}</Banner>
          </div>
        )}
        <form action={signup} className="flex flex-col gap-4">
          <label className={labelClass}>
            Full name
            <input name="full_name" placeholder="Your full name" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Email
            <input name="email" type="email" placeholder="you@example.com" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Password
            <input name="password" type="password" placeholder="At least 6 characters" required minLength={6} className={inputClass} />
          </label>
          <Button type="submit" className="mt-2 w-full">Sign up</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Log in
          </a>
        </p>
      </Card>
    </main>
  )
}
