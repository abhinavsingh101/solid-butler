'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { fetchJson } from '@/app/ui/client-api'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)

    try {
      await fetchJson('/api/auth/logout', {
        method: 'POST',
      })
      router.push('/login')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
