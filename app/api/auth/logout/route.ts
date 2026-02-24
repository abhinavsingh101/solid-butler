import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { assertCsrf, createAuthAuditEvent, getClientIp } from '@/lib/auth-security'

export async function POST(request: Request) {
  const csrfValid = await assertCsrf(request)
  const ipAddress = getClientIp(request)
  const userAgent = request.headers.get('user-agent') || undefined
  const userId = request.headers.get('x-user-id') || undefined

  if (!csrfValid) {
    await createAuthAuditEvent({
      type: 'LOGIN_BLOCKED',
      userId,
      ipAddress,
      userAgent,
      reason: 'invalid_csrf_on_logout',
    })

    return NextResponse.json({ error: 'Invalid CSRF token', code: 'INVALID_CSRF' }, { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.delete('session')
  cookieStore.delete('csrf-token')

  await createAuthAuditEvent({
    type: 'LOGOUT',
    userId,
    ipAddress,
    userAgent,
  })

  return NextResponse.json({ success: true })
}
