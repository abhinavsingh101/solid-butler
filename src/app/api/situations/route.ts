import { SituationItemStatus, SituationStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { generateSituationChecklist } from '@/lib/claude'
import { prisma } from '@/lib/db'
import {
  buildHouseholdHistoryContext,
  buildSituationTitle,
  normalizeGeneratedItems,
  parseSuggestedDueDate,
} from '@/lib/situations'

const createSituationSchema = z.object({
  title: z.string().trim().min(2).max(120).optional().nullable(),
  rawInput: z.string().trim().min(5).max(1200),
  eventDate: z.string().datetime().optional().nullable(),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const statusParam = url.searchParams.get('status')
    const status = statusParam ? z.nativeEnum(SituationStatus).safeParse(statusParam).data : undefined

    const situations = await prisma.specialSituation.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 25,
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

    return NextResponse.json({ situations })
  } catch {
    return NextResponse.json({ error: 'Failed to load situations', code: 'SITUATIONS_FETCH_FAILED' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const actorUserId = request.headers.get('x-user-id')
  if (!actorUserId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const parsed = createSituationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid situation payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const data = parsed.data
    const eventDate = data.eventDate ? new Date(data.eventDate) : null
    const safeTitle = buildSituationTitle(data.rawInput, data.title)

    const [users, memorySummaries, contextSummaries, recentSituations] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, username: true, displayName: true },
      }),
      prisma.memorySummary.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { summaryType: true, summaryText: true },
      }),
      prisma.llmMemory.findMany({
        select: { contextType: true, summary: true },
      }),
      prisma.specialSituation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true, rawInput: true, status: true, createdAt: true },
      }),
    ])

    const context = buildHouseholdHistoryContext({
      memorySummaries: memorySummaries.map((item) => ({ ...item, summaryType: item.summaryType })),
      contextSummaries: contextSummaries.map((item) => ({ ...item, contextType: item.contextType })),
      recentSituations: recentSituations.map((item) => ({ ...item, status: item.status })),
    })

    const generated = await generateSituationChecklist(data.rawInput, eventDate?.toISOString() ?? null, context)
    const normalizedItems = normalizeGeneratedItems(generated.items, eventDate)

    const userLookup = new Map<string, string>()
    for (const user of users) {
      userLookup.set(user.username.trim().toLowerCase(), user.id)
      userLookup.set(user.displayName.trim().toLowerCase(), user.id)
    }

    const created = await prisma.$transaction(async (tx) => {
      const situation = await tx.specialSituation.create({
        data: {
          title: safeTitle,
          rawInput: data.rawInput,
          eventDate,
          createdById: actorUserId,
          status: SituationStatus.ACTIVE,
        },
      })

      for (const [index, item] of normalizedItems.entries()) {
        const assigneeId = item.suggestedAssignee ? userLookup.get(item.suggestedAssignee.trim().toLowerCase()) ?? null : null
        const dueDate = parseSuggestedDueDate(item.suggestedDueDate) ?? eventDate

        await tx.situationItem.create({
          data: {
            situationId: situation.id,
            title: item.title,
            description: item.description ?? null,
            assignedToId: assigneeId,
            dueDate,
            status: SituationItemStatus.PENDING,
            displayOrder: index,
            suggestedBy: generated.source === 'claude' ? 'claude' : 'fallback',
            suggestionReason: generated.source === 'claude' ? 'Generated from household context and situation input.' : 'Template fallback.',
            suggestionConfidence: generated.source === 'claude' ? 0.65 : 0.45,
          },
        })
      }

      return tx.specialSituation.findUnique({
        where: { id: situation.id },
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
    })

    return NextResponse.json({ situation: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create situation', code: 'SITUATION_CREATE_FAILED' }, { status: 500 })
  }
}
