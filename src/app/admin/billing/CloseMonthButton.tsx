'use client'

import { Button } from '@/components/ui'

export function CloseMonthButton({ disabled, label }: { disabled: boolean; label: string }) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      onClick={(e) => {
        if (!confirm('Close this month and generate final bills for every student? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      {label}
    </Button>
  )
}
