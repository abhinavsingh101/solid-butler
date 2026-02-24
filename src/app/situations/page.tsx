import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decryptSession } from '@/lib/auth'
import { LogoutButton } from '@/app/ui/logout-button'
import { Nav } from '@/app/ui/nav'
import { SituationsClient } from '@/app/ui/situations-client'

export default async function SituationsPage() {
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
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Special Situations</h1>
            <p className="mt-1 text-sm text-zinc-400">Turn plain text into editable household checklists.</p>
          </div>
          <LogoutButton />
        </div>

        <Nav current="situations" />
        <SituationsClient />
      </div>
    </main>
  )
}
