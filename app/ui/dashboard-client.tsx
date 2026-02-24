'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchJson } from '@/app/ui/client-api'

type Assignment = {
  id: string
  dueDate: string
  notes: string | null
  chore: {
    id: string
    name: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
  }
  assignedTo: {
    id: string
    displayName: string
    username: string
  }
}

type DashboardPayload = {
  overdue: Assignment[]
  today: Assignment[]
}

const priorityClass: Record<string, string> = {
  HIGH: 'border-red-500/40',
  MEDIUM: 'border-yellow-500/40',
  LOW: 'border-emerald-500/40',
}

export function DashboardClient() {
  const [overdue, setOverdue] = useState<Assignment[]>([])
  const [today, setToday] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [schedulerLoading, setSchedulerLoading] = useState(false)

  const total = useMemo(() => overdue.length + today.length, [overdue.length, today.length])

  async function loadDashboard() {
    setLoading(true)
    setActionError('')

    try {
      const data = await fetchJson<DashboardPayload>('/api/assignments?view=dashboard')
      setOverdue(data.overdue)
      setToday(data.today)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function updateAssignment(assignmentId: string, status: 'COMPLETED' | 'SKIPPED') {
    setBusyId(assignmentId)
    setActionError('')

    try {
      await fetchJson(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await loadDashboard()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update assignment')
    } finally {
      setBusyId(null)
    }
  }

  async function runScheduler() {
    setSchedulerLoading(true)
    setActionError('')

    try {
      await fetchJson('/api/scheduler/generate-due', { method: 'POST' })
      await loadDashboard()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to run scheduler')
    } finally {
      setSchedulerLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-400">Pending chores due today or overdue</p>
          <p className="text-2xl font-semibold text-zinc-100">{total}</p>
        </div>
        <button
          type="button"
          onClick={runScheduler}
          disabled={schedulerLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {schedulerLoading ? 'Refreshing...' : 'Generate Due Chores'}
        </button>
      </div>

      {actionError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{actionError}</div>}

      {loading ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-400">Loading assignments...</div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">Overdue</h2>
            {overdue.length === 0 ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-400">No overdue chores.</p>
            ) : (
              overdue.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  busy={busyId === assignment.id}
                  onComplete={() => updateAssignment(assignment.id, 'COMPLETED')}
                  onSkip={() => updateAssignment(assignment.id, 'SKIPPED')}
                />
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Due Today</h2>
            {today.length === 0 ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-400">No chores due today.</p>
            ) : (
              today.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  busy={busyId === assignment.id}
                  onComplete={() => updateAssignment(assignment.id, 'COMPLETED')}
                  onSkip={() => updateAssignment(assignment.id, 'SKIPPED')}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}

type AssignmentCardProps = {
  assignment: Assignment
  busy: boolean
  onComplete: () => void
  onSkip: () => void
}

function AssignmentCard({ assignment, busy, onComplete, onSkip }: AssignmentCardProps) {
  return (
    <article
      className={`rounded-xl border bg-zinc-900/70 p-4 ${priorityClass[assignment.chore.priority] ?? 'border-zinc-700'} shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">{assignment.chore.name}</h3>
          <p className="mt-1 text-sm text-zinc-400">Assigned to {assignment.assignedTo.displayName}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Priority: {assignment.chore.priority}</p>
        </div>
        <time className="text-xs text-zinc-400">{new Date(assignment.dueDate).toLocaleString()}</time>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onComplete}
          disabled={busy}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Complete
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </article>
  )
}
