import { ChoreCategory, FrequencyType, Priority } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { normalizeFrequencyValue } from '@/lib/recurrence'
import { sanitizePositiveInt, urgencyDefaultsForPriority } from '@/lib/urgency'

const createChoreSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  category: z.nativeEnum(ChoreCategory),
  priority: z.nativeEnum(Priority),
  estimatedMinutes: z.number().int().min(1).max(240).optional(),
  baseUrgencyPoints: z.number().int().min(1).max(100).optional(),
  urgencyGrowthPerDay: z.number().int().min(0).max(100).optional(),
  urgencyMaxPoints: z.number().int().min(1).max(100).optional(),
  frequencyType: z.nativeEnum(FrequencyType),
  frequencyValue: z.number().int().min(1).max(365),
  defaultAssigneeId: z.string().cuid().optional().nullable(),
  nextDueAt: z.string().datetime().optional().nullable(),
})

export async function GET() {
  try {
    const chores = await prisma.chore.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      include: {
        defaultAssignee: {
          select: { id: true, username: true, displayName: true },
        },
      },
    })

    return NextResponse.json({ chores })
  } catch {
    return NextResponse.json({ error: 'Failed to load chores', code: 'CHORES_FETCH_FAILED' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createChoreSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid chore payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const data = parsed.data
    const normalizedFrequency = normalizeFrequencyValue(data.frequencyValue)
    const defaults = urgencyDefaultsForPriority(data.priority)
    const estimatedMinutes = sanitizePositiveInt(data.estimatedMinutes ?? defaults.estimatedMinutes, defaults.estimatedMinutes)
    const baseUrgencyPoints = sanitizePositiveInt(data.baseUrgencyPoints ?? defaults.baseUrgencyPoints, defaults.baseUrgencyPoints)
    const urgencyGrowthPerDay = Math.max(0, Math.floor(data.urgencyGrowthPerDay ?? defaults.urgencyGrowthPerDay))
    const urgencyMaxPoints = Math.max(baseUrgencyPoints, sanitizePositiveInt(data.urgencyMaxPoints ?? defaults.urgencyMaxPoints, defaults.urgencyMaxPoints))
    const nextDueAt =
      data.frequencyType === FrequencyType.AS_NEEDED
        ? null
        : data.nextDueAt
          ? new Date(data.nextDueAt)
          : new Date()

    const chore = await prisma.chore.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        priority: data.priority,
        estimatedMinutes,
        baseUrgencyPoints,
        urgencyGrowthPerDay,
        urgencyMaxPoints,
        frequencyType: data.frequencyType,
        frequencyValue: normalizedFrequency,
        defaultAssigneeId: data.defaultAssigneeId ?? null,
        nextDueAt,
      },
      include: {
        defaultAssignee: {
          select: { id: true, username: true, displayName: true },
        },
      },
    })

    return NextResponse.json({ chore }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A chore with this name already exists.', code: 'DUPLICATE_CHORE' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Failed to create chore', code: 'CHORE_CREATE_FAILED' }, { status: 500 })
  }
}
