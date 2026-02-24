import { ChoreCategory, FrequencyType, Priority, type Chore, type User } from '@prisma/client'
import { prisma } from '../../../../lib/db'

export type FixtureTracker = {
  userIds: string[]
  choreIds: string[]
  assignmentIds: string[]
  situationIds: string[]
}

type TestUserInput = {
  username?: string
  displayName?: string
  passwordHash?: string
}

type TestChoreInput = {
  name?: string
  description?: string | null
  category?: ChoreCategory
  priority?: Priority
  frequencyType?: FrequencyType
  frequencyValue?: number
  defaultAssigneeId?: string | null
  nextDueAt?: Date | null
}

export function createFixtureTracker(): FixtureTracker {
  return {
    userIds: [],
    choreIds: [],
    assignmentIds: [],
    situationIds: [],
  }
}

export async function createTestUser(tracker: FixtureTracker, input: TestUserInput = {}): Promise<User> {
  const label = uniqueLabel('user')
  const user = await prisma.user.create({
    data: {
      username: input.username ?? `${label}`,
      displayName: input.displayName ?? `Test ${label}`,
      passwordHash: input.passwordHash ?? 'not-used-in-integration-tests',
    },
  })

  tracker.userIds.push(user.id)
  return user
}

export async function createTestChore(tracker: FixtureTracker, input: TestChoreInput = {}): Promise<Chore> {
  const label = uniqueLabel('chore')
  const chore = await prisma.chore.create({
    data: {
      name: input.name ?? `Test chore ${label}`,
      description: input.description ?? 'Integration test fixture',
      category: input.category ?? ChoreCategory.OTHER,
      priority: input.priority ?? Priority.MEDIUM,
      frequencyType: input.frequencyType ?? FrequencyType.WEEKLY,
      frequencyValue: input.frequencyValue ?? 1,
      defaultAssigneeId: input.defaultAssigneeId ?? null,
      nextDueAt: input.nextDueAt ?? new Date(),
    },
  })

  tracker.choreIds.push(chore.id)
  return chore
}

export function trackAssignmentId(tracker: FixtureTracker, assignmentId: string): void {
  tracker.assignmentIds.push(assignmentId)
}

export async function cleanupFixtures(tracker: FixtureTracker): Promise<void> {
  const userIds = dedupe(tracker.userIds)
  const choreIds = dedupe(tracker.choreIds)
  const trackedAssignmentIds = dedupe(tracker.assignmentIds)
  const situationIds = dedupe(tracker.situationIds)

  const assignmentScope = buildAssignmentScope(userIds, choreIds, trackedAssignmentIds)

  let allAssignmentIds = trackedAssignmentIds
  if (assignmentScope.length > 0) {
    const linkedAssignments = await prisma.choreAssignment.findMany({
      where: { OR: assignmentScope },
      select: { id: true },
    })

    allAssignmentIds = dedupe([...trackedAssignmentIds, ...linkedAssignments.map((item) => item.id)])
  }

  if (allAssignmentIds.length > 0) {
    await prisma.assignmentEvent.deleteMany({
      where: { assignmentId: { in: allAssignmentIds } },
    })
  }

  const choreHistoryScope = buildChoreHistoryScope(userIds, choreIds, allAssignmentIds)
  if (choreHistoryScope.length > 0) {
    await prisma.choreHistory.deleteMany({
      where: { OR: choreHistoryScope },
    })
  }

  const gamificationScope = buildGamificationScope(userIds, allAssignmentIds)
  if (gamificationScope.length > 0) {
    await prisma.gamificationEvent.deleteMany({
      where: { OR: gamificationScope },
    })
  }

  if (allAssignmentIds.length > 0) {
    await prisma.choreAssignment.deleteMany({
      where: { id: { in: allAssignmentIds } },
    })
  }

  if (situationIds.length > 0) {
    await prisma.situationItem.deleteMany({
      where: { situationId: { in: situationIds } },
    })
    await prisma.specialSituation.deleteMany({
      where: { id: { in: situationIds } },
    })
  }

  if (userIds.length > 0) {
    await prisma.situationItem.deleteMany({
      where: { assignedToId: { in: userIds } },
    })
    await prisma.specialSituation.deleteMany({
      where: { createdById: { in: userIds } },
    })
    await prisma.authAuditEvent.deleteMany({
      where: { userId: { in: userIds } },
    })
    await prisma.aiFeedbackEvent.deleteMany({
      where: { actorUserId: { in: userIds } },
    })
    await prisma.gamificationState.deleteMany({
      where: { userId: { in: userIds } },
    })
  }

  if (choreIds.length > 0) {
    await prisma.chore.deleteMany({
      where: { id: { in: choreIds } },
    })
  }

  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    })
  }
}

function uniqueLabel(prefix: string): string {
  return `it_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids))
}

function buildAssignmentScope(userIds: string[], choreIds: string[], assignmentIds: string[]) {
  const scope: Array<Record<string, { in: string[] }>> = []

  if (userIds.length > 0) scope.push({ assignedToId: { in: userIds } })
  if (choreIds.length > 0) scope.push({ choreId: { in: choreIds } })
  if (assignmentIds.length > 0) scope.push({ id: { in: assignmentIds } })

  return scope
}

function buildChoreHistoryScope(userIds: string[], choreIds: string[], assignmentIds: string[]) {
  const scope: Array<Record<string, { in: string[] }>> = []

  if (userIds.length > 0) scope.push({ userId: { in: userIds } })
  if (choreIds.length > 0) scope.push({ choreId: { in: choreIds } })
  if (assignmentIds.length > 0) scope.push({ assignmentId: { in: assignmentIds } })

  return scope
}

function buildGamificationScope(userIds: string[], assignmentIds: string[]) {
  const scope: Array<Record<string, { in: string[] }>> = []

  if (userIds.length > 0) scope.push({ userId: { in: userIds } })
  if (assignmentIds.length > 0) scope.push({ assignmentId: { in: assignmentIds } })

  return scope
}
