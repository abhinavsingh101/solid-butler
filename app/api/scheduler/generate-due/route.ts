import { NextResponse } from 'next/server'
import { generateDueAssignments } from '@/lib/scheduler'

export async function POST() {
  try {
    const result = await generateDueAssignments(new Date())
    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: 'Failed to generate due assignments', code: 'SCHEDULER_FAILED' }, { status: 500 })
  }
}
