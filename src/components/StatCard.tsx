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
    <Card className="flex items-center gap-3 p-4!">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
      </div>
      {href && <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />}
    </Card>
  )
  return href ? <a href={href}>{content}</a> : content
}
