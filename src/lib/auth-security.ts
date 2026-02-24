import crypto from 'node:crypto'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import type { AuthAuditEventType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

const DEFAULT_AUTH_RATE_LIMIT_WINDOW_MINUTES = 15
const DEFAULT_AUTH_RATE_LIMIT_MAX_FAILURES = 12
const DEFAULT_AUTH_LOCKOUT_THRESHOLD = 5
const DEFAULT_AUTH_LOCKOUT_MINUTES = 15
const DEFAULT_AUTH_FAILURE_RESET_MINUTES = 60

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed) || parsed <= 0) return fallback
  return parsed
}

export function getAuthConfig() {
  return {
    rateLimitWindowMinutes: parsePositiveInt(
      process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES,
      DEFAULT_AUTH_RATE_LIMIT_WINDOW_MINUTES,
    ),
    rateLimitMaxFailures: parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX_FAILURES, DEFAULT_AUTH_RATE_LIMIT_MAX_FAILURES),
    lockoutThreshold: parsePositiveInt(process.env.AUTH_LOCKOUT_THRESHOLD, DEFAULT_AUTH_LOCKOUT_THRESHOLD),
    lockoutMinutes: parsePositiveInt(process.env.AUTH_LOCKOUT_MINUTES, DEFAULT_AUTH_LOCKOUT_MINUTES),
    failureResetMinutes: parsePositiveInt(process.env.AUTH_FAILURE_RESET_MINUTES, DEFAULT_AUTH_FAILURE_RESET_MINUTES),
  }
}

export function passwordMeetsPolicy(password: string): boolean {
  if (password.length < 10) return false

  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)

  return hasLower && hasUpper && hasDigit
}

export function getClientIp(request: Request | NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const candidate = forwardedFor.split(',')[0]?.trim()
    if (candidate) return candidate
  }

  const realIp = request.headers.get('x-real-ip')
  return realIp?.trim() || 'unknown'
}

export async function createAuthAuditEvent(params: {
  type: AuthAuditEventType
  userId?: string
  attemptedUsername?: string
  ipAddress?: string
  userAgent?: string
  reason?: string
  metadata?: Prisma.InputJsonValue
}) {
  try {
    await prisma.authAuditEvent.create({
      data: {
        type: params.type,
        userId: params.userId,
        attemptedUsername: params.attemptedUsername,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        reason: params.reason,
        metadata: params.metadata,
      },
    })
  } catch (error) {
    console.error('Failed to write auth audit event:', error)
  }
}

export async function hasExceededLoginFailureRateLimit(params: { ipAddress: string; username: string }): Promise<boolean> {
  const cfg = getAuthConfig()
  const windowStart = new Date(Date.now() - cfg.rateLimitWindowMinutes * 60 * 1000)

  const count = await prisma.authAuditEvent.count({
    where: {
      type: 'LOGIN_FAILURE',
      createdAt: { gte: windowStart },
      OR: [{ ipAddress: params.ipAddress }, { attemptedUsername: params.username }],
    },
  })

  return count >= cfg.rateLimitMaxFailures
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function setCsrfCookie(csrfToken: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('csrf-token', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
}

export async function assertCsrf(request: Request): Promise<boolean> {
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get('csrf-token')?.value
  const headerToken = request.headers.get('x-csrf-token')

  if (!cookieToken || !headerToken) return false
  return cookieToken === headerToken
}
