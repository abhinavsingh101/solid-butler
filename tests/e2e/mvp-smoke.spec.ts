import '../setup/env'
import bcryptjs from 'bcryptjs'
import { expect, test } from '@playwright/test'
import { prisma } from '../../lib/db'
import { cleanupFixtures, createFixtureTracker, createTestUser, type FixtureTracker } from '../integration/helpers/fixtures'

test.describe.serial('MVP smoke flows', () => {
  let tracker: FixtureTracker
  let quickTaskTitle: string | null = null

  test.beforeEach(() => {
    tracker = createFixtureTracker()
    quickTaskTitle = null
  })

  test.afterEach(async () => {
    if (quickTaskTitle) {
      const chores = await prisma.chore.findMany({
        where: { name: quickTaskTitle },
        select: { id: true },
      })
      tracker.choreIds.push(...chores.map((item) => item.id))
    }

    await cleanupFixtures(tracker)
  })

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('Username').fill('invalid-user')
    await page.getByPlaceholder('Password').fill('invalid-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Invalid credentials')).toBeVisible()
  })

  test('login -> quick assign -> complete -> gamification updates', async ({ page }) => {
    const username = `pw_${Date.now()}`
    const password = 'PlaywrightPass123'
    const passwordHash = await bcryptjs.hash(password, 12)

    const user = await createTestUser(tracker, {
      username,
      displayName: `PW ${username}`,
      passwordHash,
    })

    await page.goto('/login')
    await page.getByPlaceholder('Username').fill(username)
    await page.getByPlaceholder('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'The House Butler' })).toBeVisible()

    quickTaskTitle = `PW task ${Date.now()}`
    const quickAssignSection = page.locator('section').filter({ hasText: 'Quick Assign' }).first()

    await quickAssignSection.getByPlaceholder('Task title').fill(quickTaskTitle)
    await quickAssignSection.locator('select').selectOption(user.id)
    await quickAssignSection.getByRole('button', { name: 'Create and Assign' }).click()

    const taskCard = page.locator('article').filter({ hasText: quickTaskTitle }).first()
    await expect(taskCard).toBeVisible()

    await taskCard.getByRole('button', { name: 'Complete' }).click()

    await expect.poll(async () => {
      const response = await page.request.get('/api/gamification/summary')
      const data = (await response.json()) as {
        currentUser: { currentPoints: number; currentStreak: number }
      }

      return data.currentUser.currentPoints
    }).toBeGreaterThan(0)

    const finalSummaryResponse = await page.request.get('/api/gamification/summary')
    const summary = (await finalSummaryResponse.json()) as {
      currentUser: { currentPoints: number; currentStreak: number }
    }

    expect(summary.currentUser.currentPoints).toBeGreaterThan(0)
    expect(summary.currentUser.currentStreak).toBeGreaterThanOrEqual(1)
  })
})
