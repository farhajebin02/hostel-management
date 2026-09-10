import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui'

export function StatCard({
  icon: Icon,
  value,
  label,
  iconBg,
  iconColor,
  href,
}: {
  icon: LucideIcon
  value: number
  label: string
  iconBg: string
  iconColor: string
  href?: string
}) {
  const content = (
    <Card className="relative p-4!">
      {href && <ChevronRight className="absolute right-3 top-3 h-4 w-4 shrink-0 text-slate-300" />}
      <div className="flex items-center gap-3 pr-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </div>
      <div className="mt-2 text-xs font-medium leading-snug break-words text-slate-500">{label}</div>
    </Card>
  )
  return href ? <a href={href} className="block">{content}</a> : content
}
