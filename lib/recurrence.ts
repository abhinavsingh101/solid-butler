import { FrequencyType } from '@prisma/client'

export function normalizeFrequencyValue(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
}

export function addFrequency(date: Date, frequencyType: FrequencyType, frequencyValue: number): Date {
  const normalized = normalizeFrequencyValue(frequencyValue)
  const next = new Date(date)

  switch (frequencyType) {
    case FrequencyType.DAILY:
      next.setDate(next.getDate() + normalized)
      return next
    case FrequencyType.WEEKLY:
      next.setDate(next.getDate() + normalized * 7)
      return next
    case FrequencyType.MONTHLY:
      next.setMonth(next.getMonth() + normalized)
      return next
    case FrequencyType.AS_NEEDED:
      return next
    default:
      return next
  }
}

export function computeNextDueAfter(params: {
  currentDue: Date
  now: Date
  frequencyType: FrequencyType
  frequencyValue: number
}): Date | null {
  if (params.frequencyType === FrequencyType.AS_NEEDED) {
    return null
  }

  let next = new Date(params.currentDue)
  let safety = 0

  while (next <= params.now && safety < 500) {
    next = addFrequency(next, params.frequencyType, params.frequencyValue)
    safety += 1
  }

  return next
}

export function startOfToday(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function endOfToday(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}
