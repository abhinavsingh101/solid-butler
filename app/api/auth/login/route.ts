import bcryptjs from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { encryptSession } from '@/lib/auth'
import {
  createAuthAuditEvent,
  generateCsrfToken,
  getAuthConfig,
  getClientIp,
  hasExceededLoginFailureRateLimit,
  setCsrfCookie,
} from '@/lib/auth-security'
import { prisma } from '@/lib/db'

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
})

export async function POST(request: Request) {
  const ipAddress = getClientIp(request)
  const userAgent = request.headers.get('user-agent') || undefined

  try {
    const parsed = loginSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid login payload', code: 'INVALID_PAYLOAD' }, { status: 400 })
    }

    const username = parsed.data.username.toLowerCase()
    const { password } = parsed.data

    const rateLimited = await hasExceededLoginFailureRateLimit({ ipAddress, username })
    if (rateLimited) {
      await createAuthAuditEvent({
        type: 'LOGIN_BLOCKED',
        attemptedUsername: username,
        ipAddress,
        userAgent,
        reason: 'rate_limited',
      })

      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429 },
      )
    }

    const user = await prisma.user.findUnique({ where: { username } })
    const now = new Date()

    if (user?.lockoutUntil && user.lockoutUntil > now) {
      await createAuthAuditEvent({
        type: 'LOGIN_BLOCKED',
        userId: user.id,
        attemptedUsername: username,
        ipAddress,
        userAgent,
        reason: 'account_locked',
      })

      return NextResponse.json(
        { error: 'Account temporarily locked due to repeated failures.', code: 'ACCOUNT_LOCKED' },
        { status: 423 },
      )
    }

    const passwordValid = user ? await bcryptjs.compare(password, user.passwordHash) : false
    if (!user || !passwordValid) {
      if (user) {
        const cfg = getAuthConfig()
        const resetAfter = new Date(now.getTime() - cfg.failureResetMinutes * 60 * 1000)
        const shouldReset = !user.lastFailedLoginAt || user.lastFailedLoginAt < resetAfter
        const failedLoginAttempts = shouldReset ? 1 : user.failedLoginAttempts + 1

        let lockoutUntil: Date | null = null
        if (failedLoginAttempts >= cfg.lockoutThreshold) {
          lockoutUntil = new Date(now.getTime() + cfg.lockoutMinutes * 60 * 1000)

          await createAuthAuditEvent({
            type: 'LOCKOUT_TRIGGERED',
            userId: user.id,
            attemptedUsername: username,
            ipAddress,
            userAgent,
            reason: 'failed_attempt_threshold_reached',
            metadata: {
              failedLoginAttempts,
              lockoutMinutes: cfg.lockoutMinutes,
            },
          })
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts,
            lastFailedLoginAt: now,
            lockoutUntil,
          },
        })
      }

      await createAuthAuditEvent({
        type: 'LOGIN_FAILURE',
        userId: user?.id,
        attemptedUsername: username,
        ipAddress,
        userAgent,
        reason: 'invalid_credentials',
      })

      return NextResponse.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
      },
    })

    const sessionToken = await encryptSession({ userId: user.id, username: user.username })
    const cookieStore = await cookies()
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    const csrfToken = generateCsrfToken()
    await setCsrfCookie(csrfToken)

    await createAuthAuditEvent({
      type: 'LOGIN_SUCCESS',
      userId: user.id,
      attemptedUsername: username,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    })
  } catch (error) {
    await createAuthAuditEvent({
      type: 'LOGIN_FAILURE',
      attemptedUsername: 'unknown',
      ipAddress,
      userAgent,
      reason: 'server_error',
      metadata: {
        message: error instanceof Error ? error.message : 'unknown',
      },
    })

    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
