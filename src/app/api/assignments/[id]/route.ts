import { AssignmentEventType, AssignmentStatus, ChoreHistoryAction, SourceChannel } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { applyCompletionGamification } from '@/lib/gamification'

const updateAssignmentSchema = z.object({
  status: z.nativeEnum(AssignmentStatus).optional(),
  notes: z.string().max(500).optional().nullable(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const actorUserId = request.headers.get('x-user-id')
  if (!actorUserId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const { id } = params
    const parsed = updateAssignmentSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid assignment payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const data = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.choreAssignment.findUnique({ where: { id } })
      if (!existing) {
        throw new Error('NOT_FOUND')
      }

      const status = data.status ?? existing.status
      const completedAt =
        status === AssignmentStatus.COMPLETED || status === AssignmentStatus.SKIPPED ? new Date() : existing.completedAt

      const updated = await tx.choreAssignment.update({
        where: { id },
        data: {
          status,
          notes: data.notes ?? existing.notes,
          completedAt,
        },
        include: {
          chore: true,
          assignedTo: {
            select: { id: true, username: true, displayName: true },
          },
        },
      })

      let gamification:
        | {
            awardedPoints: number
            basePoints: number
            deduction: number
            overdueDays: number
            currentPoints: number
            currentStreak: number
            bestStreak: number
          }
        | null = null

      if (data.status && data.status !== existing.status) {
        const eventType =
          data.status === AssignmentStatus.COMPLETED
            ? AssignmentEventType.COMPLETED
            : data.status === AssignmentStatus.SKIPPED
              ? AssignmentEventType.SKIPPED
              : AssignmentEventType.NOTES_UPDATED

        await tx.assignmentEvent.create({
          data: {
            assignmentId: updated.id,
            actorUserId,
            eventType,
            sourceChannel: SourceChannel.UI,
          },
        })

        if (data.status === AssignmentStatus.COMPLETED || data.status === AssignmentStatus.SKIPPED) {
          await tx.choreHistory.create({
            data: {
              choreId: updated.choreId,
              userId: updated.assignedToId,
              action: data.status === AssignmentStatus.COMPLETED ? ChoreHistoryAction.COMPLETED : ChoreHistoryAction.SKIPPED,
              assignmentId: updated.id,
              notes: updated.notes,
            },
          })

          if (data.status === AssignmentStatus.COMPLETED) {
            const completion = await applyCompletionGamification({
              tx,
              userId: updated.assignedToId,
              assignmentId: updated.id,
              dueDate: updated.dueDate,
              completedAt: updated.completedAt ?? new Date(),
              priority: updated.chore.priority,
            })

            gamification = {
              awardedPoints: completion.points.pointsAwarded,
              basePoints: completion.points.basePoints,
              deduction: completion.points.deduction,
              overdueDays: completion.points.overdueDays,
              currentPoints: completion.state.currentPoints,
              currentStreak: completion.state.currentStreak,
              bestStreak: completion.state.bestStreak,
            }
          }
        }
      } else if (data.notes !== undefined && data.notes !== existing.notes) {
        await tx.assignmentEvent.create({
          data: {
            assignmentId: updated.id,
            actorUserId,
            eventType: AssignmentEventType.NOTES_UPDATED,
            sourceChannel: SourceChannel.UI,
          },
        })
      }

      return { assignment: updated, gamification }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Assignment not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to update assignment', code: 'ASSIGNMENT_UPDATE_FAILED' }, { status: 500 })
  }
}
