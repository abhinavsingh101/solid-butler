import { FrequencyType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { addFrequency, computeNextDueAfter, endOfToday, normalizeFrequencyValue, startOfToday } from '../../lib/recurrence'

describe('recurrence helpers', () => {
  it('normalizes invalid frequency values to positive integers', () => {
    expect(normalizeFrequencyValue(0)).toBe(1)
    expect(normalizeFrequencyValue(-4)).toBe(1)
    expect(normalizeFrequencyValue(2.9)).toBe(2)
  })

  it('adds frequency windows by type', () => {
    const base = new Date('2026-01-15T09:00:00.000Z')

    expect(addFrequency(base, FrequencyType.DAILY, 2).toISOString()).toBe('2026-01-17T09:00:00.000Z')
    expect(addFrequency(base, FrequencyType.WEEKLY, 2).toISOString()).toBe('2026-01-29T09:00:00.000Z')
    expect(addFrequency(base, FrequencyType.MONTHLY, 1).toISOString()).toBe('2026-02-15T09:00:00.000Z')
    expect(addFrequency(base, FrequencyType.AS_NEEDED, 7).toISOString()).toBe('2026-01-15T09:00:00.000Z')
  })

  it('computes the next due date after now for recurring chores', () => {
    const nextDaily = computeNextDueAfter({
      currentDue: new Date('2026-01-01T09:00:00.000Z'),
      now: new Date('2026-01-03T10:00:00.000Z'),
      frequencyType: FrequencyType.DAILY,
      frequencyValue: 1,
    })

    expect(nextDaily?.toISOString()).toBe('2026-01-04T09:00:00.000Z')

    const nextWeekly = computeNextDueAfter({
      currentDue: new Date('2026-01-01T09:00:00.000Z'),
      now: new Date('2026-02-20T10:00:00.000Z'),
      frequencyType: FrequencyType.WEEKLY,
      frequencyValue: 2,
    })

    expect(nextWeekly?.toISOString()).toBe('2026-02-26T09:00:00.000Z')
  })

  it('returns null for as-needed chores in next-due computation', () => {
    const next = computeNextDueAfter({
      currentDue: new Date('2026-01-01T09:00:00.000Z'),
      now: new Date('2026-02-20T10:00:00.000Z'),
      frequencyType: FrequencyType.AS_NEEDED,
      frequencyValue: 1,
    })

    expect(next).toBeNull()
  })

  it('calculates start and end boundaries for a day', () => {
    const source = new Date('2026-05-09T18:23:45.123Z')
    const start = startOfToday(source)
    const end = endOfToday(source)

    expect(start.getFullYear()).toBe(source.getFullYear())
    expect(start.getMonth()).toBe(source.getMonth())
    expect(start.getDate()).toBe(source.getDate())
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)

    expect(end.getFullYear()).toBe(source.getFullYear())
    expect(end.getMonth()).toBe(source.getMonth())
    expect(end.getDate()).toBe(source.getDate())
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
    expect(end.getMilliseconds()).toBe(999)
  })
})
