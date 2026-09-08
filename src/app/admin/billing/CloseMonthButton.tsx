'use client'

export function CloseMonthButton({ disabled, label }: { disabled: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded bg-green-600 p-2 text-white disabled:opacity-50"
      onClick={(e) => {
        if (!confirm('Close this month and generate final bills for every student? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      {label}
    </button>
  )
}
