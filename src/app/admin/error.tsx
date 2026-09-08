'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-red-700">Something went wrong</h1>
      <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error.message}</p>
      <button onClick={() => reset()} className="rounded bg-blue-600 px-4 py-2 text-white">
        Try again
      </button>
    </div>
  )
}
