'use client'

import { useFormStatus } from 'react-dom'
import { Save } from 'lucide-react'

export function SaveButton({ label = 'Save Meal Selection' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <Save className="h-5 w-5" />
      {pending ? 'Saving...' : label}
    </button>
  )
}
