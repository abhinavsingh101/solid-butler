import { SituationItemStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const createSituationItemSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(280).optional().nullable(),
  assignedToId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const actorUserId = request.headers.get('x-user-id')
  if (!actorUserId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const parsed = createSituationItemSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid item payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const situationId = params.id
    const data = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      const situation = await tx.specialSituation.findUnique({
        where: { id: situationId },
        select: { id: true },
      })

      if (!situation) {
        throw new Error('NOT_FOUND')
      }

      const lastItem = await tx.situationItem.findFirst({
        where: { situationId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      })

      const item = await tx.situationItem.create({
        data: {
          situationId,
          title: data.title,
          description: data.description ?? null,
          assignedToId: data.assignedToId ?? null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          status: SituationItemStatus.PENDING,
          displayOrder: (lastItem?.displayOrder ?? -1) + 1,
          suggestedBy: 'manual',
          suggestionReason: 'Added manually by user.',
          suggestionConfidence: 1,
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

      return item
    })

    return NextResponse.json({ item: result }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Situation not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to add item', code: 'SITUATION_ITEM_CREATE_FAILED' }, { status: 500 })
  }
}
