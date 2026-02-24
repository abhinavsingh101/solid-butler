import { SituationItemStatus, SituationStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const updateSituationItemSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(280).optional().nullable(),
  assignedToId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(SituationItemStatus).optional(),
  displayOrder: z.number().int().min(0).max(500).optional(),
})

export async function PATCH(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const actorUserId = request.headers.get('x-user-id')
  if (!actorUserId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const parsed = updateSituationItemSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid item payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const { id: situationId, itemId } = await context.params
    const data = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.situationItem.findFirst({
        where: {
          id: itemId,
          situationId,
        },
      })

      if (!existing) {
        throw new Error('NOT_FOUND')
      }

      const nextStatus = data.status ?? existing.status
      let nextCompletedAt = existing.completedAt
      if (nextStatus === SituationItemStatus.PENDING) {
        nextCompletedAt = null
      } else if (data.status && data.status !== existing.status) {
        nextCompletedAt = new Date()
      }

      const item = await tx.situationItem.update({
        where: { id: itemId },
        data: {
          title: data.title ?? existing.title,
          description: data.description !== undefined ? data.description : existing.description,
          assignedToId: data.assignedToId !== undefined ? data.assignedToId : existing.assignedToId,
          dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : existing.dueDate,
          status: nextStatus,
          displayOrder: data.displayOrder ?? existing.displayOrder,
          completedAt: nextCompletedAt,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      })

      const pendingCount = await tx.situationItem.count({
        where: {
          situationId,
          status: SituationItemStatus.PENDING,
        },
      })

      await tx.specialSituation.update({
        where: { id: situationId },
        data: {
          status: pendingCount === 0 ? SituationStatus.COMPLETED : SituationStatus.ACTIVE,
        },
      })

      return item
    })

    return NextResponse.json({ item: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Situation item not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to update item', code: 'SITUATION_ITEM_UPDATE_FAILED' }, { status: 500 })
  }
}
