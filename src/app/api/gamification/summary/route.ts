import { GamificationEventType } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const includeHousehold = url.searchParams.get('household') !== 'false'

    const [users, states, lastEvent] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, username: true, displayName: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.gamificationState.findMany({
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
      prisma.gamificationEvent.findFirst({
        where: {
          userId,
          eventType: GamificationEventType.CHORE_COMPLETED,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const stateByUserId = new Map(states.map((state) => [state.userId, state]))
    const current = stateByUserId.get(userId)

    const household = includeHousehold
      ? users
          .map((user) => {
            const state = stateByUserId.get(user.id)
            return {
              user,
              currentPoints: state?.currentPoints ?? 0,
              currentStreak: state?.currentStreak ?? 0,
              bestStreak: state?.bestStreak ?? 0,
              lastCompletionDate: state?.lastCompletionDate ?? null,
            }
          })
          .sort((a, b) => b.currentPoints - a.currentPoints)
      : []

    return NextResponse.json({
      currentUser: {
        userId,
        currentPoints: current?.currentPoints ?? 0,
        currentStreak: current?.currentStreak ?? 0,
        bestStreak: current?.bestStreak ?? 0,
        lastCompletionDate: current?.lastCompletionDate ?? null,
      },
      lastEarnedEvent: lastEvent
        ? {
            pointsDelta: lastEvent.pointsDelta,
            createdAt: lastEvent.createdAt,
            reason: lastEvent.reason,
          }
        : null,
      household,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load gamification summary', code: 'GAMIFICATION_SUMMARY_FAILED' }, { status: 500 })
  }
}
