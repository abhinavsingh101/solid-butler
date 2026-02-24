import { AssignmentEventType, AssignmentStatus, ChoreHistoryAction, SourceChannel } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { endOfToday, startOfToday } from '@/lib/recurrence'

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

      const pending = await prisma.choreAssignment.findMany({
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
      })

      const overdue = pending.filter((assignment) => assignment.dueDate < todayStart)
      const today = pending.filter((assignment) => assignment.dueDate >= todayStart)

      return NextResponse.json({ overdue, today })
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
