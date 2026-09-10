import { describe, it, expect } from 'vitest'
import { getTickWindowStatus, getISTDateString, getTomorrowISTDateString, getISTMonthBounds, formatTime12Hour } from '@/lib/time'

describe('getTickWindowStatus', () => {
  // Window under test: 16:00 (4 PM) to 22:00 (10 PM) IST
  it('returns before-open when now is earlier than the opening time', () => {
    // 2026-09-08T10:00:00Z = 2026-09-08 15:30 IST
    expect(getTickWindowStatus(new Date('2026-09-08T10:00:00Z'), '16:00', '22:00')).toBe('before-open')
  })

  it('returns open exactly at the opening time', () => {
    // 2026-09-08T10:30:00Z = 2026-09-08 16:00 IST
    expect(getTickWindowStatus(new Date('2026-09-08T10:30:00Z'), '16:00', '22:00')).toBe('open')
  })

  it('returns open in the middle of the window', () => {
    // 2026-09-08T13:00:00Z = 2026-09-08 18:30 IST
    expect(getTickWindowStatus(new Date('2026-09-08T13:00:00Z'), '16:00', '22:00')).toBe('open')
  })

  it('returns after-close exactly at the cutoff time', () => {
    // 2026-09-08T16:30:00Z = 2026-09-08 22:00 IST
    expect(getTickWindowStatus(new Date('2026-09-08T16:30:00Z'), '16:00', '22:00')).toBe('after-close')
  })

  it('returns after-close when now is later than the cutoff time', () => {
    // 2026-09-08T18:00:00Z = 2026-09-08 23:30 IST
    expect(getTickWindowStatus(new Date('2026-09-08T18:00:00Z'), '16:00', '22:00')).toBe('after-close')
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
