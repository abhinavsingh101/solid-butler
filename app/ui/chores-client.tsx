'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchJson } from '@/app/ui/client-api'

type User = {
  id: string
  username: string
  displayName: string
}

type Chore = {
  id: string
  name: string
  description: string | null
  category: 'CLEANING' | 'COOKING' | 'LAUNDRY' | 'MAINTENANCE' | 'SHOPPING' | 'OTHER'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedMinutes: number
  baseUrgencyPoints: number
  urgencyGrowthPerDay: number
  urgencyMaxPoints: number
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'AS_NEEDED'
  frequencyValue: number
  isActive: boolean
  nextDueAt: string | null
  defaultAssignee: User | null
}

type ChoresResponse = { chores: Chore[] }
type UsersResponse = { users: User[] }

type FormState = {
  name: string
  description: string
  category: Chore['category']
  priority: Chore['priority']
  frequencyType: Chore['frequencyType']
  frequencyValue: number
  estimatedMinutes: number
  baseUrgencyPoints: number
  urgencyGrowthPerDay: number
  urgencyMaxPoints: number
  defaultAssigneeId: string
  nextDueAt: string
}

const defaultFormState: FormState = {
  name: '',
  description: '',
  category: 'CLEANING',
  priority: 'MEDIUM',
  frequencyType: 'WEEKLY',
  frequencyValue: 1,
  estimatedMinutes: 10,
  baseUrgencyPoints: 5,
  urgencyGrowthPerDay: 1,
  urgencyMaxPoints: 10,
  defaultAssigneeId: '',
  nextDueAt: '',
}

export function ChoresClient() {
  const [users, setUsers] = useState<User[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultFormState)

  const activeCount = useMemo(() => chores.filter((item) => item.isActive).length, [chores])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [usersData, choresData] = await Promise.all([
        fetchJson<UsersResponse>('/api/users'),
        fetchJson<ChoresResponse>('/api/chores'),
      ])

      setUsers(usersData.users)
      setChores(choresData.chores)

      if (!editingId && usersData.users[0]) {
        setForm((prev) => ({ ...prev, defaultAssigneeId: prev.defaultAssigneeId || usersData.users[0]!.id }))
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load chores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function resetForm() {
    setEditingId(null)
    setForm({
      ...defaultFormState,
      defaultAssigneeId: users[0]?.id || '',
    })
  }

  async function saveChore(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      priority: form.priority,
      frequencyType: form.frequencyType,
      frequencyValue: Number(form.frequencyValue),
      estimatedMinutes: Number(form.estimatedMinutes),
      baseUrgencyPoints: Number(form.baseUrgencyPoints),
      urgencyGrowthPerDay: Number(form.urgencyGrowthPerDay),
      urgencyMaxPoints: Number(form.urgencyMaxPoints),
      defaultAssigneeId: form.defaultAssigneeId || null,
      nextDueAt: form.nextDueAt ? new Date(form.nextDueAt).toISOString() : null,
    }

    try {
      if (editingId) {
        await fetchJson(`/api/chores/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } else {
        await fetchJson('/api/chores', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      resetForm()
      await loadData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save chore')
    } finally {
      setSaving(false)
    }
  }

  function editChore(chore: Chore) {
    setEditingId(chore.id)
    setForm({
      name: chore.name,
      description: chore.description || '',
      category: chore.category,
      priority: chore.priority,
      frequencyType: chore.frequencyType,
      frequencyValue: chore.frequencyValue,
      estimatedMinutes: chore.estimatedMinutes,
      baseUrgencyPoints: chore.baseUrgencyPoints,
      urgencyGrowthPerDay: chore.urgencyGrowthPerDay,
      urgencyMaxPoints: chore.urgencyMaxPoints,
      defaultAssigneeId: chore.defaultAssignee?.id || '',
      nextDueAt: chore.nextDueAt ? new Date(chore.nextDueAt).toISOString().slice(0, 16) : '',
    })
  }

  async function archiveChore(choreId: string) {
    setError('')
    try {
      await fetchJson(`/api/chores/${choreId}`, { method: 'DELETE' })
      await loadData()
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Failed to archive chore')
    }
  }

  async function createAssignmentNow(chore: Chore) {
    setError('')

    if (!chore.defaultAssignee?.id) {
      setError('Set a default assignee before creating an assignment.')
      return
    }

    try {
      await fetchJson('/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          choreId: chore.id,
          assignedToId: chore.defaultAssignee.id,
          dueDate: new Date().toISOString(),
        }),
      })
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create assignment')
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <p className="text-sm text-zinc-400">Active chores</p>
        <p className="text-2xl font-semibold text-zinc-100">{activeCount}</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h2 className="text-base font-semibold text-zinc-100">{editingId ? 'Edit Chore' : 'Add Chore'}</h2>

        <form className="mt-4 space-y-3" onSubmit={saveChore}>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Chore name"
          />

          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Description (optional)"
            rows={2}
          />

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={form.category}
              onChange={(value) => setForm((prev) => ({ ...prev, category: value as FormState['category'] }))}
              options={['CLEANING', 'COOKING', 'LAUNDRY', 'MAINTENANCE', 'SHOPPING', 'OTHER']}
            />
            <Select
              value={form.priority}
              onChange={(value) => setForm((prev) => ({ ...prev, priority: value as FormState['priority'] }))}
              options={['HIGH', 'MEDIUM', 'LOW']}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={form.frequencyType}
              onChange={(value) => setForm((prev) => ({ ...prev, frequencyType: value as FormState['frequencyType'] }))}
              options={['DAILY', 'WEEKLY', 'MONTHLY', 'AS_NEEDED']}
            />

            <input
              type="number"
              min={1}
              value={form.frequencyValue}
              onChange={(e) => setForm((prev) => ({ ...prev, frequencyValue: Number(e.target.value) || 1 }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Frequency value"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={1}
              value={form.estimatedMinutes}
              onChange={(e) => setForm((prev) => ({ ...prev, estimatedMinutes: Number(e.target.value) || 10 }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Estimated minutes"
            />
            <input
              type="number"
              min={1}
              value={form.baseUrgencyPoints}
              onChange={(e) => setForm((prev) => ({ ...prev, baseUrgencyPoints: Number(e.target.value) || 1 }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Base urgency"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={form.urgencyGrowthPerDay}
              onChange={(e) => setForm((prev) => ({ ...prev, urgencyGrowthPerDay: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Urgency growth/day"
            />
            <input
              type="number"
              min={1}
              value={form.urgencyMaxPoints}
              onChange={(e) => setForm((prev) => ({ ...prev, urgencyMaxPoints: Number(e.target.value) || 1 }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Urgency max"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={form.defaultAssigneeId}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultAssigneeId: e.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
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
              value={form.nextDueAt}
              onChange={(e) => setForm((prev) => ({ ...prev, nextDueAt: e.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Chore'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">All Chores</h2>

        {loading ? (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-400">Loading chores...</p>
        ) : chores.length === 0 ? (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-400">No chores yet.</p>
        ) : (
          chores.map((chore) => (
            <article key={chore.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">{chore.name}</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    {chore.category} • {chore.priority} • {chore.frequencyType} ({chore.frequencyValue})
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Duration: ~{chore.estimatedMinutes} min • Urgency {chore.baseUrgencyPoints}+{chore.urgencyGrowthPerDay}/day up to {chore.urgencyMaxPoints}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Assignee: {chore.defaultAssignee?.displayName || 'Unassigned'} • Next due:{' '}
                    {chore.nextDueAt ? new Date(chore.nextDueAt).toLocaleString() : 'Not scheduled'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    chore.isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {chore.isActive ? 'Active' : 'Archived'}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => createAssignmentNow(chore)}
                  className="rounded-lg border border-blue-500/40 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/10"
                >
                  Assign Now
                </button>
                <button
                  type="button"
                  onClick={() => editChore(chore)}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
                >
                  Edit
                </button>
                {chore.isActive && (
                  <button
                    type="button"
                    onClick={() => archiveChore(chore.id)}
                    className="rounded-lg border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                  >
                    Archive
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}

type SelectProps = {
  value: string
  onChange: (value: string) => void
  options: string[]
}

function Select({ value, onChange, options }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}
