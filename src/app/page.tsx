import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decryptSession } from '@/lib/auth'
import { DashboardClient } from '@/app/ui/dashboard-client'
import { LogoutButton } from './ui/logout-button'
import { Nav } from './ui/nav'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value

  if (!sessionToken) {
    redirect('/login')
  }

  const session = await decryptSession(sessionToken)
  if (!session) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">The House Butler</h1>
            <p className="mt-1 text-sm text-zinc-400">Today and overdue chores for both household members.</p>
          </div>
          <LogoutButton />
        </div>

        <Nav current="dashboard" />
        <DashboardClient />
      </div>
    </main>
  )
}
