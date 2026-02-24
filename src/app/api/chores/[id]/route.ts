import { ChoreCategory, FrequencyType, Priority } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { normalizeFrequencyValue } from '@/lib/recurrence'
import { sanitizePositiveInt } from '@/lib/urgency'

const updateChoreSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  category: z.nativeEnum(ChoreCategory).optional(),
  priority: z.nativeEnum(Priority).optional(),
  estimatedMinutes: z.number().int().min(1).max(240).optional(),
  baseUrgencyPoints: z.number().int().min(1).max(100).optional(),
  urgencyGrowthPerDay: z.number().int().min(0).max(100).optional(),
  urgencyMaxPoints: z.number().int().min(1).max(100).optional(),
  frequencyType: z.nativeEnum(FrequencyType).optional(),
  frequencyValue: z.number().int().min(1).max(365).optional(),
  defaultAssigneeId: z.string().cuid().optional().nullable(),
  nextDueAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const parsed = updateChoreSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid chore payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.category !== undefined) updateData.category = data.category
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.frequencyType !== undefined) updateData.frequencyType = data.frequencyType
    if (data.frequencyValue !== undefined) updateData.frequencyValue = normalizeFrequencyValue(data.frequencyValue)
    if (data.estimatedMinutes !== undefined) updateData.estimatedMinutes = sanitizePositiveInt(data.estimatedMinutes, 10)
    if (data.baseUrgencyPoints !== undefined) updateData.baseUrgencyPoints = sanitizePositiveInt(data.baseUrgencyPoints, 5)
    if (data.urgencyGrowthPerDay !== undefined) updateData.urgencyGrowthPerDay = Math.max(0, Math.floor(data.urgencyGrowthPerDay))
    if (data.urgencyMaxPoints !== undefined) updateData.urgencyMaxPoints = sanitizePositiveInt(data.urgencyMaxPoints, 10)
    if (data.defaultAssigneeId !== undefined) updateData.defaultAssigneeId = data.defaultAssigneeId
    if (data.nextDueAt !== undefined) updateData.nextDueAt = data.nextDueAt ? new Date(data.nextDueAt) : null
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    if (data.frequencyType === FrequencyType.AS_NEEDED) {
      updateData.nextDueAt = null
    }

    if (data.baseUrgencyPoints !== undefined || data.urgencyMaxPoints !== undefined) {
      const current = await prisma.chore.findUnique({
        where: { id },
        select: {
          baseUrgencyPoints: true,
          urgencyMaxPoints: true,
        },
      })

      if (!current) {
        return NextResponse.json({ error: 'Chore not found', code: 'CHORE_NOT_FOUND' }, { status: 404 })
      }

      const nextBase = (updateData.baseUrgencyPoints as number | undefined) ?? current.baseUrgencyPoints
      const nextMax = (updateData.urgencyMaxPoints as number | undefined) ?? current.urgencyMaxPoints

      if (nextMax < nextBase) {
        updateData.urgencyMaxPoints = nextBase
      }
    }

    const chore = await prisma.chore.update({
      where: { id },
      data: updateData,
      include: {
        defaultAssignee: {
          select: { id: true, username: true, displayName: true },
        },
      },
    })

    return NextResponse.json({ chore })
  } catch {
    return NextResponse.json({ error: 'Failed to update chore', code: 'CHORE_UPDATE_FAILED' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    await prisma.chore.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to archive chore', code: 'CHORE_ARCHIVE_FAILED' }, { status: 500 })
  }
}
