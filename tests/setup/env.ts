import fs from 'node:fs'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())
overrideWithLocalEnvFile()

const env = process.env as Record<string, string | undefined>
env.NODE_ENV = 'test'

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret'
}

function overrideWithLocalEnvFile(): void {
  const localEnvPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(localEnvPath)) return

  const lines = fs.readFileSync(localEnvPath, 'utf8').split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}
