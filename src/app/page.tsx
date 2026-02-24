import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decryptSession } from '@/lib/auth'
import { LogoutButton } from './ui/logout-button'

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
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">The House Butler</h1>
            <p className="mt-2 text-zinc-400">Signed in as {session.username}. Core chore features are next.</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </main>
  )
}
