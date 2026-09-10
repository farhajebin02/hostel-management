import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui'

export function ActionCard({
  icon: Icon,
  label,
  href,
  iconBg,
  iconColor,
}: {
  icon: LucideIcon
  label: string
  href: string
  iconBg: string
  iconColor: string
}) {
  return (
    <Link href={href}>
      <Card className="flex h-full flex-col items-start gap-3 p-4! transition-transform active:scale-[0.98]">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <span className="text-sm font-semibold text-slate-900">{label}</span>
      </Card>
    </Link>
  )
}
