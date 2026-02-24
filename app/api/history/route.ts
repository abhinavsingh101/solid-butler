import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 100

type TimelineItem = {
  id: string
  category: 'CHORE_HISTORY' | 'ASSIGNMENT_EVENT' | 'GAMIFICATION'
  timestamp: string
  title: string
  description: string
}

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const requestedLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(requestedLimit)))
      : DEFAULT_LIMIT

    const querySize = Math.min(MAX_LIMIT, limit * 2)

    const [choreHistory, assignmentEvents, gamificationEvents] = await Promise.all([
      prisma.choreHistory.findMany({
        take: querySize,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
          chore: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.assignmentEvent.findMany({
        take: querySize,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: {
            select: { id: true, username: true, displayName: true },
          },
          assignment: {
            select: {
              id: true,
              dueDate: true,
              chore: { select: { id: true, name: true } },
              assignedTo: {
                select: { id: true, username: true, displayName: true },
              },
            },
          },
        },
      }),
      prisma.gamificationEvent.findMany({
        take: querySize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
    ])

    const timeline: TimelineItem[] = []

    for (const event of choreHistory) {
      timeline.push({
        id: `chore-${event.id}`,
        category: 'CHORE_HISTORY',
        timestamp: event.timestamp.toISOString(),
        title: `${event.user.displayName} ${formatChoreAction(event.action)} ${event.chore.name}`,
        description: event.notes ? event.notes : `Action: ${event.action.toLowerCase()}`,
      })
    }

    for (const event of assignmentEvents) {
      const actor = event.actorUser?.displayName ?? 'System'
      const choreName = event.assignment.chore.name
      const assignee = event.assignment.assignedTo.displayName

      timeline.push({
        id: `assignment-${event.id}`,
        category: 'ASSIGNMENT_EVENT',
        timestamp: event.createdAt.toISOString(),
        title: `${actor}: ${formatAssignmentEvent(event.eventType)}`,
        description: `${choreName} (assigned to ${assignee})`,
      })
    }

    for (const event of gamificationEvents) {
      const pointsPrefix = event.pointsDelta >= 0 ? '+' : ''
      timeline.push({
        id: `gamification-${event.id}`,
        category: 'GAMIFICATION',
        timestamp: event.createdAt.toISOString(),
        title: `${event.user.displayName} earned ${pointsPrefix}${event.pointsDelta} points`,
        description: event.reason ?? event.eventType,
      })
    }

    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const items = timeline.slice(0, limit)

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: 'Failed to load history', code: 'HISTORY_FETCH_FAILED' }, { status: 500 })
  }
}

function formatChoreAction(action: string): string {
  switch (action) {
    case 'COMPLETED':
      return 'completed'
    case 'SKIPPED':
      return 'skipped'
    case 'ASSIGNED':
      return 'was assigned'
    case 'REASSIGNED':
      return 'was reassigned'
    default:
      return action.toLowerCase()
  }
}

function formatAssignmentEvent(eventType: string): string {
  switch (eventType) {
    case 'CREATED':
      return 'created assignment'
    case 'REASSIGNED':
      return 'reassigned task'
    case 'COMPLETED':
      return 'marked complete'
    case 'SKIPPED':
      return 'marked skipped'
    case 'DUE_DATE_CHANGED':
      return 'changed due date'
    case 'NOTES_UPDATED':
      return 'updated notes'
    default:
      return eventType.toLowerCase()
  }
}
