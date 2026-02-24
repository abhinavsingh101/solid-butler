import { type Priority } from '@prisma/client'

const DAY_MS = 24 * 60 * 60 * 1000
export const DASHBOARD_URGENCY_BUDGET = 100

type UrgencyDefaults = {
  estimatedMinutes: number
  baseUrgencyPoints: number
  urgencyGrowthPerDay: number
  urgencyMaxPoints: number
}

export function urgencyDefaultsForPriority(priority: Priority): UrgencyDefaults {
  switch (priority) {
    case 'HIGH':
      return {
        estimatedMinutes: 15,
        baseUrgencyPoints: 8,
        urgencyGrowthPerDay: 2,
        urgencyMaxPoints: 14,
      }
    case 'MEDIUM':
      return {
        estimatedMinutes: 10,
        baseUrgencyPoints: 5,
        urgencyGrowthPerDay: 1,
        urgencyMaxPoints: 10,
      }
    case 'LOW':
      return {
        estimatedMinutes: 10,
        baseUrgencyPoints: 2,
        urgencyGrowthPerDay: 1,
        urgencyMaxPoints: 6,
      }
  }
}

export function sanitizePositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1) return fallback
  return Math.floor(value)
}

export function computeUrgencyPoints(params: {
  dueDate: Date
  referenceDate: Date
  baseUrgencyPoints: number
  urgencyGrowthPerDay: number
  urgencyMaxPoints: number
}): number {
  const base = sanitizePositiveInt(params.baseUrgencyPoints, 1)
  const growth = Math.max(0, Math.floor(params.urgencyGrowthPerDay || 0))
  const max = Math.max(base, sanitizePositiveInt(params.urgencyMaxPoints, base))

  const overdueMs = params.referenceDate.getTime() - params.dueDate.getTime()
  if (overdueMs <= 0 || growth === 0) {
    return base
  }

  const overdueDays = Math.floor(overdueMs / DAY_MS) + 1
  const escalated = base + overdueDays * growth
  return Math.min(escalated, max)
}

export function distributeFiniteUrgencyPoints(rawPoints: number[], totalBudget: number = DASHBOARD_URGENCY_BUDGET): number[] {
  if (rawPoints.length === 0) return []

  const budget = sanitizePositiveInt(totalBudget, DASHBOARD_URGENCY_BUDGET)
  const normalized = rawPoints.map((point) => (Number.isFinite(point) ? Math.max(0, Math.floor(point)) : 0))
  const totalRaw = normalized.reduce((sum, point) => sum + point, 0)

  if (totalRaw === 0) {
    const baseShare = Math.floor(budget / normalized.length)
    const remaining = budget - baseShare * normalized.length
    return normalized.map((_point, index) => baseShare + (index < remaining ? 1 : 0))
  }

  const exactShares = normalized.map((point) => (point / totalRaw) * budget)
  const allocated = exactShares.map((share) => Math.floor(share))
  let remainder = budget - allocated.reduce((sum, share) => sum + share, 0)

  if (remainder > 0) {
    const byRemainder = exactShares
      .map((share, index) => ({
        index,
        fractional: share - allocated[index]!,
        raw: normalized[index]!,
      }))
      .sort((a, b) => {
        if (b.fractional !== a.fractional) return b.fractional - a.fractional
        if (b.raw !== a.raw) return b.raw - a.raw
        return a.index - b.index
      })

    let pointer = 0
    while (remainder > 0) {
      const target = byRemainder[pointer % byRemainder.length]!
      allocated[target.index] = (allocated[target.index] ?? 0) + 1
      pointer += 1
      remainder -= 1
    }
  }

  return allocated
}
