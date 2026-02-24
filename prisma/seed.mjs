import { PrismaClient, ChoreCategory, FrequencyType, MemoryContextType, Priority } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_USERS = [
  { username: 'abhinav', displayName: 'Abhinav', password: 'ChangeMeAbhinav1' },
  { username: 'partner', displayName: 'Partner', password: 'ChangeMePartner1' },
]

const DEFAULT_CHORES = [
  { name: 'Wipe drawing room surfaces', category: ChoreCategory.CLEANING, priority: Priority.MEDIUM, frequencyType: FrequencyType.DAILY, frequencyValue: 3 },
  { name: 'Wipe living room surfaces', category: ChoreCategory.CLEANING, priority: Priority.MEDIUM, frequencyType: FrequencyType.DAILY, frequencyValue: 3 },
  { name: 'Wipe bedrooms surfaces', category: ChoreCategory.CLEANING, priority: Priority.MEDIUM, frequencyType: FrequencyType.DAILY, frequencyValue: 3 },
  { name: 'Dust sofas', category: ChoreCategory.CLEANING, priority: Priority.MEDIUM, frequencyType: FrequencyType.WEEKLY, frequencyValue: 1 },
  { name: 'Dust blinds', category: ChoreCategory.CLEANING, priority: Priority.LOW, frequencyType: FrequencyType.WEEKLY, frequencyValue: 1 },
  { name: 'Clean bathrooms', category: ChoreCategory.CLEANING, priority: Priority.HIGH, frequencyType: FrequencyType.DAILY, frequencyValue: 3 },
  { name: 'Clean wash basins', category: ChoreCategory.CLEANING, priority: Priority.HIGH, frequencyType: FrequencyType.WEEKLY, frequencyValue: 1 },
  { name: 'Clean kitchen counters', category: ChoreCategory.CLEANING, priority: Priority.HIGH, frequencyType: FrequencyType.DAILY, frequencyValue: 1 },
  { name: 'Do laundry', category: ChoreCategory.LAUNDRY, priority: Priority.MEDIUM, frequencyType: FrequencyType.DAILY, frequencyValue: 3 },
  { name: 'Change bed sheets', category: ChoreCategory.LAUNDRY, priority: Priority.MEDIUM, frequencyType: FrequencyType.WEEKLY, frequencyValue: 1 },
  { name: 'Buy vegetables', category: ChoreCategory.SHOPPING, priority: Priority.HIGH, frequencyType: FrequencyType.WEEKLY, frequencyValue: 1 },
  { name: 'Water plants', category: ChoreCategory.MAINTENANCE, priority: Priority.MEDIUM, frequencyType: FrequencyType.DAILY, frequencyValue: 3 },
  { name: 'Restock pantry', category: ChoreCategory.SHOPPING, priority: Priority.MEDIUM, frequencyType: FrequencyType.AS_NEEDED, frequencyValue: 1 },
  { name: 'Get wheat ground into flour', category: ChoreCategory.SHOPPING, priority: Priority.MEDIUM, frequencyType: FrequencyType.MONTHLY, frequencyValue: 1 },
]

async function main() {
  console.log('Seeding database...')

  const users = await Promise.all(
    DEFAULT_USERS.map(async (user) => {
      const passwordHash = await bcryptjs.hash(user.password, 12)

      return prisma.user.upsert({
        where: { username: user.username },
        update: { displayName: user.displayName },
        create: {
          username: user.username,
          displayName: user.displayName,
          passwordHash,
        },
      })
    }),
  )

  const assigneeIds = users.map((user) => user.id)
  const now = new Date()

  for (const [index, chore] of DEFAULT_CHORES.entries()) {
    await prisma.chore.upsert({
      where: { name: chore.name },
      update: {
        category: chore.category,
        priority: chore.priority,
        frequencyType: chore.frequencyType,
        frequencyValue: chore.frequencyValue,
        isActive: true,
        defaultAssigneeId: assigneeIds[index % assigneeIds.length],
        nextDueAt: now,
      },
      create: {
        name: chore.name,
        category: chore.category,
        priority: chore.priority,
        frequencyType: chore.frequencyType,
        frequencyValue: chore.frequencyValue,
        defaultAssigneeId: assigneeIds[index % assigneeIds.length],
        nextDueAt: now,
      },
    })
  }

  for (const contextType of Object.values(MemoryContextType)) {
    await prisma.llmMemory.upsert({
      where: { contextType },
      update: {},
      create: {
        contextType,
        summary: 'No data yet. This summary is refreshed as new household events are captured.',
      },
    })
  }

  console.log(`Seeded ${DEFAULT_USERS.length} users, ${DEFAULT_CHORES.length} chores, and memory placeholders.`)
  console.log('Default credentials:')
  for (const user of DEFAULT_USERS) {
    console.log(`- ${user.username} / ${user.password}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
