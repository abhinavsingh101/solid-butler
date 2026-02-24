import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
    // Next.js 16 breaking change: cookies() is async
    const cookieStore = await cookies()
    cookieStore.delete('session')
    return NextResponse.json({ success: true })
}
