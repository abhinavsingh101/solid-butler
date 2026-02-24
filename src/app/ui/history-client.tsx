'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/app/ui/client-api'

type HistoryItem = {
  id: string
  category: 'CHORE_HISTORY' | 'ASSIGNMENT_EVENT' | 'GAMIFICATION'
  timestamp: string
  title: string
  description: string
}

type HistoryPayload = {
  items: HistoryItem[]
}

const categoryStyle: Record<HistoryItem['category'], string> = {
  CHORE_HISTORY: 'border-emerald-500/40 text-emerald-200',
  ASSIGNMENT_EVENT: 'border-blue-500/40 text-blue-200',
  GAMIFICATION: 'border-amber-500/40 text-amber-200',
}

export function HistoryClient() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await fetchJson<HistoryPayload>('/api/history?limit=50')
      setItems(data.items)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) {
    return <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-400">Loading history...</div>
  }

  if (error) {
    return <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
  }

  if (items.length === 0) {
    return <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-400">No history yet.</div>
  }

  return (
    <section className="mt-6 space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold ${categoryStyle[item.category]}`}>
                {item.category.replace('_', ' ')}
              </span>
              <p className="mt-2 text-xs text-zinc-500">{new Date(item.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}
