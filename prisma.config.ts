import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Prefer local overrides for development, then fall back to default .env
loadEnv({ path: '.env.local' })
loadEnv()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.mjs',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
