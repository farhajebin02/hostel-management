'use client'

export function DeleteButton() {
  return (
    <button
      type="submit"
      className="rounded bg-red-600 p-2 text-white"
      onClick={(e) => {
        if (!confirm('Delete this student permanently? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      Delete student
    </button>
  )
}
