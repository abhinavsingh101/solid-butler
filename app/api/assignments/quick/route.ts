import {
  AssignmentEventType,
  AssignmentStatus,
  ChoreCategory,
  ChoreHistoryAction,
  FrequencyType,
  Priority,
  SourceChannel,
} from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { sanitizePositiveInt, urgencyDefaultsForPriority } from '@/lib/urgency'

const quickAssignSchema = z.object({
  title: z.string().trim().min(2).max(120),
  assignedToId: z.string().cuid(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  estimatedMinutes: z.number().int().min(1).max(240).optional(),
})

export async function POST(request: Request) {
  const actorUserId = request.headers.get('x-user-id')
  if (!actorUserId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const parsed = quickAssignSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid quick assignment payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const data = parsed.data
    const priority = data.priority ?? Priority.MEDIUM
    const defaults = urgencyDefaultsForPriority(priority)

    const result = await prisma.$transaction(async (tx) => {
      let chore = await tx.chore.findFirst({
        where: {
          name: data.title,
          isActive: true,
        },
      })

      if (!chore) {
        chore = await tx.chore.create({
          data: {
            name: data.title,
            category: ChoreCategory.OTHER,
            priority,
            frequencyType: FrequencyType.AS_NEEDED,
            frequencyValue: 1,
            defaultAssigneeId: data.assignedToId,
            estimatedMinutes: sanitizePositiveInt(data.estimatedMinutes ?? defaults.estimatedMinutes, defaults.estimatedMinutes),
            baseUrgencyPoints: defaults.baseUrgencyPoints,
            urgencyGrowthPerDay: defaults.urgencyGrowthPerDay,
            urgencyMaxPoints: defaults.urgencyMaxPoints,
          },
        })
      }

      const assignment = await tx.choreAssignment.create({
        data: {
          choreId: chore.id,
          assignedToId: data.assignedToId,
          dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
          notes: data.notes ?? null,
          status: AssignmentStatus.PENDING,
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
          assignmentId: assignment.id,
          actorUserId,
          eventType: AssignmentEventType.CREATED,
          sourceChannel: SourceChannel.UI,
          metadata: {
            mode: 'quick_assign',
          },
        },
      })

      await tx.choreHistory.create({
        data: {
          choreId: assignment.choreId,
          userId: assignment.assignedToId,
          action: ChoreHistoryAction.ASSIGNED,
          assignmentId: assignment.id,
          notes: `Quick assigned by user ${actorUserId}`,
        },
      })

      return assignment
    })

    return NextResponse.json({ assignment: result }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to quick-assign task', code: 'QUICK_ASSIGN_FAILED' }, { status: 500 })
  }
}
