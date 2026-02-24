import Link from 'next/link'

type NavProps = {
  current: 'dashboard' | 'chores' | 'situations' | 'history'
}

export function Nav({ current }: NavProps) {
  const base = 'rounded-lg px-3 py-2 text-sm font-medium transition-colors'

  return (
    <nav className="mt-4 flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-2">
      <Link
        href="/"
        className={`${base} ${current === 'dashboard' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'}`}
      >
        Dashboard
      </Link>
      <Link
        href="/chores"
        className={`${base} ${current === 'chores' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'}`}
      >
        Chores
      </Link>
      <Link
        href="/situations"
        className={`${base} ${current === 'situations' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'}`}
      >
        Situations
      </Link>
      <Link
        href="/history"
        className={`${base} ${current === 'history' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'}`}
      >
        History
      </Link>
    </nav>
  )
}
