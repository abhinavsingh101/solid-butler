import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    })

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: 'Failed to load users', code: 'USERS_FETCH_FAILED' }, { status: 500 })
  }
}
