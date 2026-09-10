const IST_TIMEZONE = 'Asia/Kolkata'

function getISTParts(now: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return {
    year: Number(get('year')),
    month: Number(get('month')), // 1-indexed
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  }
}

export function getISTDateString(now: Date = new Date()): string {
  const { year, month, day } = getISTParts(now)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getTomorrowISTDateString(now: Date = new Date()): string {
  const { year, month, day } = getISTParts(now)
  const tomorrow = new Date(Date.UTC(year, month - 1, day) + 24 * 60 * 60 * 1000)
  return `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrow.getUTCDate()).padStart(2, '0')}`
}

export type TickWindowStatus = 'before-open' | 'open' | 'after-close'

export function getTickWindowStatus(now: Date, openTime: string, closeTime: string): TickWindowStatus {
  const { hour, minute } = getISTParts(now)
  const nowMinutes = hour * 60 + minute
  const [openHour, openMinute] = openTime.split(':').map(Number)
  const [closeHour, closeMinute] = closeTime.split(':').map(Number)
  const openMinutes = openHour * 60 + openMinute
  const closeMinutes = closeHour * 60 + closeMinute

  if (nowMinutes < openMinutes) return 'before-open'
  if (nowMinutes >= closeMinutes) return 'after-close'
  return 'open'
}

export function formatTime12Hour(time24: string): string {
  const [hour, minute] = time24.split(':').map(Number)
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

export function getISTMonthBounds(now: Date = new Date()): { start: string; end: string; month: string } {
  const { year, month } = getISTParts(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  // Date.UTC's month param is 0-indexed, so passing our 1-indexed `month`
  // directly lands on the first day of the *next* month.
  const nextMonth = new Date(Date.UTC(year, month, 1))
  const end = `${nextMonth.getUTCFullYear()}-${pad(nextMonth.getUTCMonth() + 1)}-01`
  return { start, end, month: `${year}-${pad(month)}` }
}
