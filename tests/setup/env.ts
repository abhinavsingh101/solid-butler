import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

process.env.NODE_ENV = 'test'

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret'
}
