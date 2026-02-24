import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { decryptSession } from '@/lib/auth'
import { generateCsrfToken, setCsrfCookie } from '@/lib/auth-security'

export async function GET() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value

  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const session = await decryptSession(sessionToken)
  if (!session) {
    return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 })
  }

  let csrfToken = cookieStore.get('csrf-token')?.value
  if (!csrfToken) {
    csrfToken = generateCsrfToken()
    await setCsrfCookie(csrfToken)
  }

  return NextResponse.json({
    user: {
      userId: session.userId,
      username: session.username,
    },
    csrfToken,
  })
}
