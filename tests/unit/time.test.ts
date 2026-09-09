import { describe, it, expect } from 'vitest'
import { isBeforeCutoff, getISTDateString, getTomorrowISTDateString, getISTMonthBounds, formatTime12Hour } from '@/lib/time'

describe('isBeforeCutoff', () => {
  it('returns true when now is before the cutoff time in IST', () => {
    // 2026-09-08T16:29:00Z = 2026-09-08 21:59 IST
    expect(isBeforeCutoff(new Date('2026-09-08T16:29:00Z'), '22:00')).toBe(true)
  })

  it('returns false exactly at the cutoff time in IST', () => {
    // 2026-09-08T16:30:00Z = 2026-09-08 22:00 IST
    expect(isBeforeCutoff(new Date('2026-09-08T16:30:00Z'), '22:00')).toBe(false)
  })

  it('returns false when now is after the cutoff time in IST', () => {
    // 2026-09-08T16:31:00Z = 2026-09-08 22:01 IST
    expect(isBeforeCutoff(new Date('2026-09-08T16:31:00Z'), '22:00')).toBe(false)
  })
})

describe('getISTDateString / getTomorrowISTDateString', () => {
  it('computes the IST calendar date for a UTC instant already past midnight IST', () => {
    // 2026-09-08T19:00:00Z = 2026-09-09 00:30 IST
    const now = new Date('2026-09-08T19:00:00Z')
    expect(getISTDateString(now)).toBe('2026-09-09')
    expect(getTomorrowISTDateString(now)).toBe('2026-09-10')
  })
})

describe('getISTMonthBounds', () => {
  it('computes the first day of the current and next IST month', () => {
    // 2026-09-08T10:00:00Z = 2026-09-08 15:30 IST
    const now = new Date('2026-09-08T10:00:00Z')
    expect(getISTMonthBounds(now)).toEqual({ start: '2026-09-01', end: '2026-10-01', month: '2026-09' })
  })
})

describe('formatTime12Hour', () => {
  it('formats an evening time', () => {
    expect(formatTime12Hour('22:00')).toBe('10:00 PM')
  })

  it('formats a morning time', () => {
    expect(formatTime12Hour('09:05')).toBe('9:05 AM')
  })

  it('formats midnight and noon correctly', () => {
    expect(formatTime12Hour('00:00')).toBe('12:00 AM')
    expect(formatTime12Hour('12:00')).toBe('12:00 PM')
  })
})
