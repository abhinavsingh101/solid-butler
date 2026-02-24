import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { decryptSession } from '@/lib/auth'

const publicRoutes = new Set(['/login', '/api/auth/login'])

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (publicRoutes.has(path)) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('session')?.value
  if (!sessionToken) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await decryptSession(sessionToken)
  if (!session) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isApiRoute = path.startsWith('/api/')
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())
  if (isApiRoute && isMutation && path !== '/api/auth/login') {
    const csrfCookie = request.cookies.get('csrf-token')?.value
    const csrfHeader = request.headers.get('x-csrf-token')
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: 'Invalid CSRF token', code: 'INVALID_CSRF' }, { status: 403 })
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', session.userId)
  requestHeaders.set('x-username', session.username)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
