import { AssignmentStatus, ChoreCategory, FrequencyType, Priority } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../lib/db'
import { GET as getAssignments, POST as createAssignment } from '../../app/api/assignments/route'
import { PATCH as patchAssignment } from '../../app/api/assignments/[id]/route'
import { DELETE as archiveChore, PATCH as patchChore } from '../../app/api/chores/[id]/route'
import { POST as createChore } from '../../app/api/chores/route'
import { GET as getGamificationSummary } from '../../app/api/gamification/summary/route'
import { POST as runScheduler } from '../../app/api/scheduler/generate-due/route'
import { cleanupFixtures, createFixtureTracker, createTestChore, createTestUser, trackAssignmentId, type FixtureTracker } from './helpers/fixtures'

type ChoreCreateResponse = {
  chore: {
    id: string
    name: string
    priority: Priority
    isActive: boolean
  }
}

type AssignmentCreateResponse = {
  assignment: {
    id: string
    status: AssignmentStatus
    choreId: string
    assignedToId: string
  }
}

type AssignmentPatchResponse = {
  assignment: {
    id: string
    status: AssignmentStatus
  }
  gamification: {
    awardedPoints: number
    currentPoints: number
    currentStreak: number
  } | null
}

type GamificationSummaryResponse = {
  currentUser: {
    userId: string
    currentPoints: number
    currentStreak: number
  }
}

describe.sequential('core API integration', () => {
  let tracker: FixtureTracker

  beforeEach(() => {
    tracker = createFixtureTracker()
  })

  afterEach(async () => {
    await cleanupFixtures(tracker)
  })

  it('creates, updates, and archives a chore', async () => {
    const assignee = await createTestUser(tracker)

    const createResponse = await createChore(
      jsonRequest('/api/chores', 'POST', {
        name: `Integration Chore ${Date.now()}`,
        description: 'created in test',
        category: ChoreCategory.CLEANING,
        priority: Priority.HIGH,
        estimatedMinutes: 20,
        baseUrgencyPoints: 7,
        urgencyGrowthPerDay: 2,
        urgencyMaxPoints: 12,
        frequencyType: FrequencyType.WEEKLY,
        frequencyValue: 1,
        defaultAssigneeId: assignee.id,
        nextDueAt: new Date().toISOString(),
      }),
    )

    expect(createResponse.status).toBe(201)
    const created = await readJson<ChoreCreateResponse>(createResponse)
    expect(created.chore.id).toBeTruthy()
    tracker.choreIds.push(created.chore.id)

    const updateResponse = await patchChore(
      jsonRequest('/api/chores/id', 'PATCH', {
        priority: Priority.LOW,
        estimatedMinutes: 12,
      }),
      { params: Promise.resolve({ id: created.chore.id }) },
    )

    expect(updateResponse.status).toBe(200)
    const updated = await readJson<ChoreCreateResponse>(updateResponse)
    expect(updated.chore.priority).toBe(Priority.LOW)

    const archiveResponse = await archiveChore(jsonRequest('/api/chores/id', 'DELETE'), {
      params: Promise.resolve({ id: created.chore.id }),
    })
    expect(archiveResponse.status).toBe(200)

    const archived = await prisma.chore.findUnique({
      where: { id: created.chore.id },
      select: { isActive: true },
    })
    expect(archived?.isActive).toBe(false)
  })

  it('completing an assignment updates gamification summary', async () => {
    const actor = await createTestUser(tracker)
    const assignee = await createTestUser(tracker)
    const chore = await createTestChore(tracker, {
      category: ChoreCategory.CLEANING,
      priority: Priority.HIGH,
      frequencyType: FrequencyType.WEEKLY,
      defaultAssigneeId: assignee.id,
      nextDueAt: new Date(),
    })

    const assignmentCreateResponse = await createAssignment(
      jsonRequest(
        '/api/assignments',
        'POST',
        {
          choreId: chore.id,
          assignedToId: assignee.id,
          dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        {
          'x-user-id': actor.id,
        },
      ),
    )

    expect(assignmentCreateResponse.status).toBe(201)
    const createdAssignment = await readJson<AssignmentCreateResponse>(assignmentCreateResponse)
    trackAssignmentId(tracker, createdAssignment.assignment.id)

    const patchResponse = await patchAssignment(
      jsonRequest(
        `/api/assignments/${createdAssignment.assignment.id}`,
        'PATCH',
        {
          status: AssignmentStatus.COMPLETED,
        },
        {
          'x-user-id': actor.id,
        },
      ),
      { params: Promise.resolve({ id: createdAssignment.assignment.id }) },
    )

    expect(patchResponse.status).toBe(200)
    const patched = await readJson<AssignmentPatchResponse>(patchResponse)
    expect(patched.assignment.status).toBe(AssignmentStatus.COMPLETED)
    expect(patched.gamification?.awardedPoints ?? 0).toBeGreaterThan(0)

    const summaryResponse = await getGamificationSummary(
      jsonRequest('/api/gamification/summary', 'GET', undefined, {
        'x-user-id': assignee.id,
      }),
    )
    expect(summaryResponse.status).toBe(200)
    const summary = await readJson<GamificationSummaryResponse>(summaryResponse)
    expect(summary.currentUser.userId).toBe(assignee.id)
    expect(summary.currentUser.currentPoints).toBeGreaterThan(0)
    expect(summary.currentUser.currentStreak).toBeGreaterThanOrEqual(1)
  })

  it('scheduler does not create duplicate pending assignments for the same chore', async () => {
    const assignee = await createTestUser(tracker)
    const recurringChore = await createTestChore(tracker, {
      category: ChoreCategory.MAINTENANCE,
      priority: Priority.MEDIUM,
      frequencyType: FrequencyType.DAILY,
      frequencyValue: 1,
      defaultAssigneeId: assignee.id,
      nextDueAt: new Date(Date.now() - 60 * 1000),
    })

    const beforeCount = await prisma.choreAssignment.count({
      where: {
        choreId: recurringChore.id,
        status: AssignmentStatus.PENDING,
      },
    })
    expect(beforeCount).toBe(0)

    const firstRun = await runScheduler(jsonRequest('/api/scheduler/generate-due', 'POST'))
    expect(firstRun.status).toBe(200)

    const afterFirstCount = await prisma.choreAssignment.count({
      where: {
        choreId: recurringChore.id,
        status: AssignmentStatus.PENDING,
      },
    })
    expect(afterFirstCount).toBe(1)

    const secondRun = await runScheduler(jsonRequest('/api/scheduler/generate-due', 'POST'))
    expect(secondRun.status).toBe(200)

    const afterSecondCount = await prisma.choreAssignment.count({
      where: {
        choreId: recurringChore.id,
        status: AssignmentStatus.PENDING,
      },
    })
    expect(afterSecondCount).toBe(1)
  })

  it('dashboard assignments endpoint returns priority plan and busy-day payload', async () => {
    const assignee = await createTestUser(tracker)
    const chore = await createTestChore(tracker, {
      category: ChoreCategory.CLEANING,
      priority: Priority.HIGH,
      frequencyType: FrequencyType.WEEKLY,
      defaultAssigneeId: assignee.id,
      nextDueAt: new Date(),
    })

    const assignmentCreateResponse = await createAssignment(
      jsonRequest(
        '/api/assignments',
        'POST',
        {
          choreId: chore.id,
          assignedToId: assignee.id,
          dueDate: new Date().toISOString(),
        },
        {
          'x-user-id': assignee.id,
        },
      ),
    )

    expect(assignmentCreateResponse.status).toBe(201)
    const createdAssignment = await readJson<AssignmentCreateResponse>(assignmentCreateResponse)
    trackAssignmentId(tracker, createdAssignment.assignment.id)

    const dashboardResponse = await getAssignments(jsonRequest('/api/assignments?view=dashboard', 'GET'))
    expect(dashboardResponse.status).toBe(200)
    const dashboard = await readJson<{
      overdue: unknown[]
      today: unknown[]
      priorityPlan: unknown[]
      busyDays: unknown[]
    }>(dashboardResponse)

    expect(Array.isArray(dashboard.overdue)).toBe(true)
    expect(Array.isArray(dashboard.today)).toBe(true)
    expect(Array.isArray(dashboard.priorityPlan)).toBe(true)
    expect(Array.isArray(dashboard.busyDays)).toBe(true)
    expect(dashboard.priorityPlan.length).toBeGreaterThan(0)
  })
})

function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Request {
  const requestHeaders = new Headers(headers)

  const init: RequestInit = {
    method,
    headers: requestHeaders,
  }

  if (body !== undefined) {
    requestHeaders.set('content-type', 'application/json')
    init.body = JSON.stringify(body)
  }

  return new Request(`http://localhost:3000${url}`, init)
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}
