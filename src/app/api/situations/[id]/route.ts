import { SituationStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { buildSituationTitle } from '@/lib/situations'

const updateSituationSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  rawInput: z.string().trim().min(5).max(1200).optional(),
  eventDate: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(SituationStatus).optional(),
})

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actorUserId = request.headers.get('x-user-id')
  if (!actorUserId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const parsed = updateSituationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid situation payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const { id } = await context.params
    const data = parsed.data
    const existing = await prisma.specialSituation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Situation not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.specialSituation.update({
      where: { id },
      data: {
        title: data.title ? buildSituationTitle(data.rawInput ?? existing.rawInput, data.title) : existing.title,
        rawInput: data.rawInput ?? existing.rawInput,
        eventDate: data.eventDate !== undefined ? (data.eventDate ? new Date(data.eventDate) : null) : existing.eventDate,
        status: data.status ?? existing.status,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        items: {
          orderBy: { displayOrder: 'asc' },
          include: {
            assignedTo: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ situation: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to update situation', code: 'SITUATION_UPDATE_FAILED' }, { status: 500 })
  }
}
