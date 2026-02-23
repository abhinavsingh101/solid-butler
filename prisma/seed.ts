import { PrismaClient, ChoreCategory, FrequencyType, Priority } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create household members (upsert = safe to re-run)
    const [user1, user2] = await Promise.all([
        prisma.user.upsert({
            where: { username: 'user1' },
            update: {},
            create: {
                username: 'user1',
                displayName: 'Member 1', // Update in app settings
                passwordHash: await bcryptjs.hash('changeme1', 12),
            },
        }),
        prisma.user.upsert({
            where: { username: 'user2' },
            update: {},
            create: {
                username: 'user2',
                displayName: 'Member 2', // Update in app settings
                passwordHash: await bcryptjs.hash('changeme2', 12),
            },
        }),
    ])

    console.log(`✅ Users: ${user1.displayName}, ${user2.displayName}`)

    // Pre-seeded chores — upsert by name so re-runs don't create duplicates
    const chores = [
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
        { name: 'Water plants', category: ChoreCategory.MAINTENANCE, priority: Priority.MEDIUM, frequencyType: FrequencyType.DAILY, frequencyValue: 3 }, // twice a week roughly
        { name: 'Restock pantry', category: ChoreCategory.SHOPPING, priority: Priority.MEDIUM, frequencyType: FrequencyType.AS_NEEDED, frequencyValue: 1 },
        { name: 'Get wheat ground into flour', category: ChoreCategory.SHOPPING, priority: Priority.MEDIUM, frequencyType: FrequencyType.MONTHLY, frequencyValue: 1 },
    ]

    for (const chore of chores) {
        await prisma.chore.upsert({
            where: { name: chore.name },
            update: {},
            create: {
                name: chore.name,
                category: chore.category,
                priority: chore.priority,
                frequencyType: chore.frequencyType,
                frequencyValue: chore.frequencyValue ?? 1,
            },
        })
    }

    console.log(`✅ Seeded ${chores.length} chores`)

    // Seed initial LLM memory placeholders
    const { MemoryContextType } = await import('@prisma/client')
    for (const contextType of Object.values(MemoryContextType)) {
        await prisma.llmMemory.upsert({
            where: { contextType },
            update: {},
            create: {
                contextType,
                summary: 'No data yet. This will be populated as the household uses the app.',
            },
        })
    }

    console.log('✅ LLM memory placeholders ready')
    console.log('\n🎉 Seed complete!')
    console.log('   Username: user1  Password: changeme1')
    console.log('   Username: user2  Password: changeme2')
    console.log('   ⚠️  Change these passwords after first login!\n')
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
