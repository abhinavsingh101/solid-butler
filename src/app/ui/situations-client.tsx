'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchJson } from '@/app/ui/client-api'

type User = {
  id: string
  username: string
  displayName: string
}

type SituationItem = {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED'
  displayOrder: number
  assignedTo: User | null
}

type Situation = {
  id: string
  title: string
  rawInput: string
  eventDate: string | null
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  createdBy: User
  items: SituationItem[]
}

type SituationsResponse = {
  situations: Situation[]
}

type UsersResponse = {
  users: User[]
}

type CreateSituationResponse = {
  situation: Situation
}

type UpdateSituationResponse = {
  situation: Situation
}

type CreateItemResponse = {
  item: SituationItem
}

const statusClass: Record<Situation['status'], string> = {
  ACTIVE: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  COMPLETED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  CANCELLED: 'border-zinc-600/30 bg-zinc-700/10 text-zinc-300',
}

export function SituationsClient() {
  const [users, setUsers] = useState<User[]>([])
  const [situations, setSituations] = useState<Situation[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [rawInput, setRawInput] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({})
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  const activeCount = useMemo(() => situations.filter((item) => item.status === 'ACTIVE').length, [situations])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [usersData, situationsData] = await Promise.all([
        fetchJson<UsersResponse>('/api/users'),
        fetchJson<SituationsResponse>('/api/situations'),
      ])
      setUsers(usersData.users)
      setSituations(situationsData.situations)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load situations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function createSituation(e: React.FormEvent) {
    e.preventDefault()
    if (!rawInput.trim()) {
      setError('Describe the situation first.')
      return
    }

    setCreating(true)
    setError('')
    try {
      const created = await fetchJson<CreateSituationResponse>('/api/situations', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim() || null,
          rawInput,
          eventDate: eventDate ? new Date(eventDate).toISOString() : null,
        }),
      })

      setSituations((prev) => [created.situation, ...prev])
      setTitle('')
      setRawInput('')
      setEventDate('')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create situation')
    } finally {
      setCreating(false)
    }
  }

  async function updateSituation(situationId: string, payload: Partial<Pick<Situation, 'status'>>) {
    setBusyIds((prev) => new Set(prev).add(situationId))
    setError('')

    try {
      const response = await fetchJson<UpdateSituationResponse>(`/api/situations/${situationId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      setSituations((prev) => prev.map((item) => (item.id === situationId ? response.situation : item)))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update situation')
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(situationId)
        return next
      })
    }
  }

  async function createItem(situationId: string) {
    const itemTitle = (newItemTitles[situationId] ?? '').trim()
    if (!itemTitle) {
      setError('Enter a checklist item title.')
      return
    }

    setBusyIds((prev) => new Set(prev).add(situationId))
    setError('')

    try {
      await fetchJson<CreateItemResponse>(`/api/situations/${situationId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          title: itemTitle,
        }),
      })

      setNewItemTitles((prev) => ({ ...prev, [situationId]: '' }))
      await loadData()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to add checklist item')
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(situationId)
        return next
      })
    }
  }

  async function updateItem(
    situationId: string,
    itemId: string,
    payload: Partial<{
      title: string
      description: string | null
      assignedToId: string | null
      dueDate: string | null
      status: SituationItem['status']
      displayOrder: number
    }>,
  ) {
    setBusyIds((prev) => new Set(prev).add(itemId))
    setError('')

    try {
      await fetchJson(`/api/situations/${situationId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      await loadData()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update checklist item')
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <p className="text-sm text-zinc-400">Active situations</p>
        <p className="text-2xl font-semibold text-zinc-100">{activeCount}</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h2 className="text-base font-semibold text-zinc-100">New Situation</h2>
        <p className="mt-1 text-sm text-zinc-400">Describe the context in plain language. The app generates an editable checklist.</p>

        <form className="mt-4 space-y-3" onSubmit={createSituation}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Optional title (for example: Weekend Guests)"
          />

          <textarea
            required
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            rows={4}
            placeholder="Example: We have guests on Saturday evening. Please help us prepare the house and groceries."
          />

          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />

          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {creating ? 'Generating checklist...' : 'Create Situation Checklist'}
          </button>
        </form>
      </section>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-400">Loading situations...</div>
      ) : situations.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-400">No situations yet.</div>
      ) : (
        <div className="space-y-4">
          {situations.map((situation) => (
            <section key={situation.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">{situation.title}</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Created by {situation.createdBy.displayName} on {new Date(situation.createdAt).toLocaleString()}
                  </p>
                  {situation.eventDate && (
                    <p className="mt-1 text-xs text-zinc-500">Event date: {new Date(situation.eventDate).toLocaleString()}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass[situation.status]}`}>
                    {situation.status}
                  </span>
                  <select
                    value={situation.status}
                    disabled={busyIds.has(situation.id)}
                    onChange={(e) =>
                      updateSituation(situation.id, { status: e.target.value as Situation['status'] })
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-300">{situation.rawInput}</p>

              <div className="mt-4 space-y-2">
                {situation.items.map((item) => (
                  <div
                    key={`${item.id}:${item.title}:${item.status}:${item.assignedTo?.id ?? ''}:${item.dueDate ?? ''}:${item.description ?? ''}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        defaultValue={item.title}
                        onBlur={(e) => {
                          const nextValue = e.target.value.trim()
                          if (nextValue && nextValue !== item.title) {
                            void updateItem(situation.id, item.id, { title: nextValue })
                          }
                        }}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                      />

                      <select
                        value={item.status}
                        disabled={busyIds.has(item.id)}
                        onChange={(e) =>
                          updateItem(situation.id, item.id, {
                            status: e.target.value as SituationItem['status'],
                          })
                        }
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="SKIPPED">Skipped</option>
                      </select>
                    </div>

                    <textarea
                      defaultValue={item.description ?? ''}
                      rows={2}
                      onBlur={(e) => {
                        const nextValue = e.target.value.trim()
                        const normalized = nextValue.length > 0 ? nextValue : null
                        if (normalized !== (item.description ?? null)) {
                          void updateItem(situation.id, item.id, { description: normalized })
                        }
                      }}
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                      placeholder="Description (optional)"
                    />

                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        value={item.assignedTo?.id ?? ''}
                        disabled={busyIds.has(item.id)}
                        onChange={(e) =>
                          updateItem(situation.id, item.id, {
                            assignedToId: e.target.value || null,
                          })
                        }
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.displayName}
                          </option>
                        ))}
                      </select>

                      <input
                        type="datetime-local"
                        defaultValue={toLocalInputDate(item.dueDate)}
                        onBlur={(e) => {
                          const next = e.target.value ? new Date(e.target.value).toISOString() : null
                          const current = item.dueDate ? new Date(item.dueDate).toISOString() : null
                          if (next !== current) {
                            void updateItem(situation.id, item.id, { dueDate: next })
                          }
                        }}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={newItemTitles[situation.id] ?? ''}
                  onChange={(e) => setNewItemTitles((prev) => ({ ...prev, [situation.id]: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  placeholder="Add another checklist item"
                />
                <button
                  type="button"
                  disabled={busyIds.has(situation.id)}
                  onClick={() => void createItem(situation.id)}
                  className="rounded-lg bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function toLocalInputDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}
