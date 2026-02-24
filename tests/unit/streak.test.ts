import { describe, expect, it } from 'vitest'
import { computeNextStreak } from '../../lib/gamification'

describe('streak helper', () => {
  it('starts at 1 when there is no previous completion', () => {
    const streak = computeNextStreak(0, null, new Date('2026-02-24T10:00:00.000Z'))
    expect(streak).toBe(1)
  })

  it('keeps streak unchanged for same-day completions', () => {
    const streak = computeNextStreak(3, new Date('2026-02-24T07:00:00.000Z'), new Date('2026-02-24T22:00:00.000Z'))
    expect(streak).toBe(3)
  })

  it('increments streak for next-day completion', () => {
    const streak = computeNextStreak(3, new Date('2026-02-24T22:00:00.000Z'), new Date('2026-02-25T06:00:00.000Z'))
    expect(streak).toBe(4)
  })

  it('resets streak when more than one day is missed', () => {
    const streak = computeNextStreak(5, new Date('2026-02-20T22:00:00.000Z'), new Date('2026-02-24T06:00:00.000Z'))
    expect(streak).toBe(1)
  })

  it('normalizes non-positive current streak to 1 for same-day updates', () => {
    const streak = computeNextStreak(0, new Date('2026-02-24T01:00:00.000Z'), new Date('2026-02-24T05:00:00.000Z'))
    expect(streak).toBe(1)
  })
})
