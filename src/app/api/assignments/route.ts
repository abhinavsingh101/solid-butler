import { AssignmentEventType, AssignmentStatus, ChoreHistoryAction, SourceChannel } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { endOfToday, startOfToday } from '@/lib/recurrence'
import { DASHBOARD_URGENCY_BUDGET, computeUrgencyPoints, distributeFiniteUrgencyPoints } from '@/lib/urgency'

const createAssignmentSchema = z.object({
  choreId: z.string().cuid(),
  assignedToId: z.string().cuid(),
  dueDate: z.string().datetime(),
  notes: z.string().max(500).optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const view = url.searchParams.get('view')

    if (view === 'dashboard') {
      const todayStart = startOfToday()
      const todayEnd = endOfToday()
      const busyWindowEnd = new Date(todayEnd)
      busyWindowEnd.setDate(busyWindowEnd.getDate() + 7)

      const [pending, windowAssignments] = await Promise.all([
        prisma.choreAssignment.findMany({
          where: {
            status: AssignmentStatus.PENDING,
            dueDate: { lte: todayEnd },
          },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
          include: {
            chore: true,
            assignedTo: {
              select: { id: true, username: true, displayName: true },
            },
          },
        }),
        prisma.choreAssignment.findMany({
          where: {
            status: AssignmentStatus.PENDING,
            dueDate: {
              gte: todayStart,
              lte: busyWindowEnd,
            },
          },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
          include: {
            chore: {
              select: {
                estimatedMinutes: true,
                baseUrgencyPoints: true,
                urgencyGrowthPerDay: true,
                urgencyMaxPoints: true,
              },
            },
          },
        }),
      ])

      const withRawUrgency = pending
        .map((assignment) => {
          const rawUrgency = computeUrgencyPoints({
            dueDate: assignment.dueDate,
            referenceDate: new Date(),
            baseUrgencyPoints: assignment.chore.baseUrgencyPoints,
            urgencyGrowthPerDay: assignment.chore.urgencyGrowthPerDay,
            urgencyMaxPoints: assignment.chore.urgencyMaxPoints,
          })

          return {
            ...assignment,
            rawUrgency,
            estimatedMinutes: assignment.chore.estimatedMinutes,
          }
        })
        .sort((a, b) => {
          if (b.rawUrgency !== a.rawUrgency) return b.rawUrgency - a.rawUrgency
          return a.dueDate.getTime() - b.dueDate.getTime()
        })
      const allocatedUrgency = distributeFiniteUrgencyPoints(withRawUrgency.map((assignment) => assignment.rawUrgency), DASHBOARD_URGENCY_BUDGET)
      const ranked = withRawUrgency.map((assignment, index) => ({
        ...assignment,
        urgencyPoints: allocatedUrgency[index] ?? 0,
        urgencyBudgetTotal: DASHBOARD_URGENCY_BUDGET,
        priorityRank: index + 1,
      }))

      const overdue = ranked.filter((assignment) => assignment.dueDate < todayStart)
      const today = ranked.filter((assignment) => assignment.dueDate >= todayStart && assignment.dueDate <= todayEnd)

      let cumulativeMinutes = 0
      const priorityPlan = ranked.map((assignment) => {
        cumulativeMinutes += assignment.estimatedMinutes
        return {
          assignmentId: assignment.id,
          taskName: assignment.chore.name,
          priorityRank: assignment.priorityRank,
          urgencyPoints: assignment.urgencyPoints,
          urgencyBudgetTotal: assignment.urgencyBudgetTotal,
          estimatedMinutes: assignment.estimatedMinutes,
          cumulativeMinutes,
        }
      })

      const busyByDate = new Map<
        string,
        {
          date: string
          highUrgencyCount: number
          totalTasks: number
          totalEstimatedMinutes: number
        }
      >()

      for (const assignment of windowAssignments) {
        const date = toDateKey(assignment.dueDate)
        const rawUrgency = computeUrgencyPoints({
          dueDate: assignment.dueDate,
          referenceDate: new Date(),
          baseUrgencyPoints: assignment.chore.baseUrgencyPoints,
          urgencyGrowthPerDay: assignment.chore.urgencyGrowthPerDay,
          urgencyMaxPoints: assignment.chore.urgencyMaxPoints,
        })

        const summary = busyByDate.get(date) ?? {
          date,
          highUrgencyCount: 0,
          totalTasks: 0,
          totalEstimatedMinutes: 0,
        }

        summary.totalTasks += 1
        summary.totalEstimatedMinutes += assignment.chore.estimatedMinutes
        if (rawUrgency >= 8) {
          summary.highUrgencyCount += 1
        }

        busyByDate.set(date, summary)
      }

      const busyDays = Array.from(busyByDate.values())
        .filter((day) => day.highUrgencyCount >= 2)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((day) => ({
          ...day,
          reason: `${day.highUrgencyCount} high-urgency tasks due`,
          recommendedFocusMinutes: day.highUrgencyCount >= 3 || day.totalEstimatedMinutes >= 90 ? 60 : 30,
        }))

      return NextResponse.json({ overdue, today, priorityPlan, busyDays })
    }

    const status = url.searchParams.get('status') as AssignmentStatus | null

    const assignments = await prisma.choreAssignment.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        chore: true,
        assignedTo: {
          select: { id: true, username: true, displayName: true },
        },
      },
    })

    return NextResponse.json({ assignments })
  } catch {
    return NextResponse.json({ error: 'Failed to load assignments', code: 'ASSIGNMENTS_FETCH_FAILED' }, { status: 500 })
  }
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function POST(request: Request) {
  const actorUserId = request.headers.get('x-user-id')
  if (!actorUserId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const parsed = createAssignmentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid assignment payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const data = parsed.data

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.choreAssignment.create({
        data: {
          choreId: data.choreId,
          assignedToId: data.assignedToId,
          dueDate: new Date(data.dueDate),
          notes: data.notes ?? null,
        },
        include: {
          chore: true,
          assignedTo: {
            select: { id: true, username: true, displayName: true },
          },
        },
      })

      await tx.assignmentEvent.create({
        data: {
          assignmentId: created.id,
          actorUserId,
          eventType: AssignmentEventType.CREATED,
          sourceChannel: SourceChannel.UI,
        },
      })

      await tx.choreHistory.create({
        data: {
          choreId: created.choreId,
          userId: created.assignedToId,
          action: ChoreHistoryAction.ASSIGNED,
          assignmentId: created.id,
          notes: 'Created manually in app.',
        },
      })

      return created
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create assignment', code: 'ASSIGNMENT_CREATE_FAILED' }, { status: 500 })
  }
}
