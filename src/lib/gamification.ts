import { GamificationEventType, Priority, type Prisma } from '@prisma/client'

const DAY_MS = 24 * 60 * 60 * 1000

type CompletionPoints = {
  basePoints: number
  overdueDays: number
  deduction: number
  pointsAwarded: number
}

export async function applyCompletionGamification(params: {
  tx: Prisma.TransactionClient
  userId: string
  assignmentId: string
  dueDate: Date
  completedAt: Date
  priority: Priority
}): Promise<{
  state: {
    currentPoints: number
    currentStreak: number
    bestStreak: number
    lastCompletionDate: Date | null
  }
  points: CompletionPoints
  eventCreated: boolean
}> {
  const duplicate = await params.tx.gamificationEvent.findUnique({
    where: {
      assignmentId_eventType: {
        assignmentId: params.assignmentId,
        eventType: GamificationEventType.CHORE_COMPLETED,
      },
    },
  })

  const existingState = await params.tx.gamificationState.upsert({
    where: { userId: params.userId },
    update: {},
    create: { userId: params.userId },
  })

  const points = calculateCompletionPoints({
    dueDate: params.dueDate,
    completedAt: params.completedAt,
    priority: params.priority,
  })

  if (duplicate) {
    return {
      state: {
        currentPoints: existingState.currentPoints,
        currentStreak: existingState.currentStreak,
        bestStreak: existingState.bestStreak,
        lastCompletionDate: existingState.lastCompletionDate,
      },
      points,
      eventCreated: false,
    }
  }

  const nextStreak = computeNextStreak(existingState.currentStreak, existingState.lastCompletionDate, params.completedAt)
  const nextBestStreak = Math.max(existingState.bestStreak, nextStreak)

  const nextState = await params.tx.gamificationState.update({
    where: { userId: params.userId },
    data: {
      currentPoints: existingState.currentPoints + points.pointsAwarded,
      currentStreak: nextStreak,
      bestStreak: nextBestStreak,
      lastCompletionDate: params.completedAt,
    },
  })

  await params.tx.gamificationEvent.create({
    data: {
      userId: params.userId,
      eventType: GamificationEventType.CHORE_COMPLETED,
      pointsDelta: points.pointsAwarded,
      assignmentId: params.assignmentId,
      reason:
        points.overdueDays > 0
          ? `Completed late by ${points.overdueDays} day(s); deduction applied.`
          : 'Completed on time.',
      metadata: {
        basePoints: points.basePoints,
        overdueDays: points.overdueDays,
        deduction: points.deduction,
        priority: params.priority,
      },
    },
  })

  return {
    state: {
      currentPoints: nextState.currentPoints,
      currentStreak: nextState.currentStreak,
      bestStreak: nextState.bestStreak,
      lastCompletionDate: nextState.lastCompletionDate,
    },
    points,
    eventCreated: true,
  }
}

export function calculateCompletionPoints(params: {
  dueDate: Date
  completedAt: Date
  priority: Priority
}): CompletionPoints {
  const basePoints = priorityBasePoints[params.priority] ?? 10
  const overdueMs = params.completedAt.getTime() - params.dueDate.getTime()
  const overdueDays = overdueMs > 0 ? Math.floor(overdueMs / DAY_MS) + 1 : 0
  const deduction = overdueDays > 0 ? Math.min(Math.floor(basePoints / 2), overdueDays * 2) : 0
  const pointsAwarded = Math.max(1, basePoints - deduction)

  return {
    basePoints,
    overdueDays,
    deduction,
    pointsAwarded,
  }
}

export function computeNextStreak(currentStreak: number, lastCompletionDate: Date | null, nextCompletionDate: Date): number {
  if (!lastCompletionDate) return 1

  const lastDay = utcStartOfDay(lastCompletionDate)
  const nextDay = utcStartOfDay(nextCompletionDate)
  const diffDays = Math.floor((nextDay.getTime() - lastDay.getTime()) / DAY_MS)

  if (diffDays <= 0) {
    return currentStreak > 0 ? currentStreak : 1
  }

  if (diffDays === 1) {
    return Math.max(1, currentStreak) + 1
  }

  return 1
}

function utcStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const priorityBasePoints: Record<Priority, number> = {
  HIGH: 12,
  MEDIUM: 10,
  LOW: 8,
}
