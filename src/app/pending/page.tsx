export default function PendingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Awaiting approval</h1>
      <p>Your account has been created. A hostel admin needs to review and approve it before you can submit meal ticks.</p>
      <form action="/logout" method="post">
        <button type="submit" className="text-sm text-blue-600 underline">Log out</button>
      </form>
    </main>
  )
}
