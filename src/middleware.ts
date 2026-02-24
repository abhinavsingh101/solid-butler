import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

const protectedRoutes = ['/', '/chores', '/situations', '/history', '/api/chores', '/api/situations', '/api/llm']
const publicRoutes = ['/login', '/api/auth/login']

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route) && !publicRoutes.includes(path))

    if (!isProtectedRoute) {
        return NextResponse.next()
    }

    // Next.js 16 breaking change: cookies() is now async, but request.cookies is still synchronous in middleware
    const cookie = request.cookies.get('session')?.value

    if (!cookie) {
        if (path.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await decrypt(cookie)

    if (!payload || !payload.userId) {
        if (path.startsWith('/api/')) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Attach user ID header for downstream API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId as string)

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
