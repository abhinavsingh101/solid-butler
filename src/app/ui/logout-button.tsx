'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

function getCookieValue(name: string): string {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))

  return cookie ? decodeURIComponent(cookie.split('=')[1] || '') : ''
}

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)

    try {
      const csrfToken = getCookieValue('csrf-token')
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
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
