'use client'

import { Button } from '@/components/ui'

export function DeleteButton() {
  return (
    <Button
      type="submit"
      variant="danger"
      onClick={(e) => {
        if (!confirm('Delete this student permanently? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      Delete student
    </Button>
  )
}
