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
    estimatedMinutes: number
  }
  assignedTo: {
    id: string
    displayName: string
    username: string
  }
  urgencyPoints: number
  urgencyBudgetTotal: number
  priorityRank: number
}

type DashboardPayload = {
  overdue: Assignment[]
  today: Assignment[]
  priorityPlan: Array<{
    assignmentId: string
    taskName: string
    priorityRank: number
    urgencyPoints: number
    urgencyBudgetTotal: number
    estimatedMinutes: number
    cumulativeMinutes: number
  }>
  busyDays: Array<{
    date: string
    highUrgencyCount: number
    totalTasks: number
    totalEstimatedMinutes: number
    reason: string
    recommendedFocusMinutes: 30 | 60
  }>
}

type GamificationSummaryPayload = {
  currentUser: {
    userId: string
    currentPoints: number
    currentStreak: number
    bestStreak: number
    lastCompletionDate: string | null
  }
  lastEarnedEvent: {
    pointsDelta: number
    createdAt: string
    reason: string | null
  } | null
  household: Array<{
    user: {
      id: string
      username: string
      displayName: string
    }
    currentPoints: number
    currentStreak: number
    bestStreak: number
    lastCompletionDate: string | null
  }>
}

const priorityClass: Record<string, string> = {
  HIGH: 'border-red-500/40',
  MEDIUM: 'border-yellow-500/40',
  LOW: 'border-emerald-500/40',
}

export function DashboardClient() {
  const [overdue, setOverdue] = useState<Assignment[]>([])
  const [today, setToday] = useState<Assignment[]>([])
  const [priorityPlan, setPriorityPlan] = useState<DashboardPayload['priorityPlan']>([])
  const [busyDays, setBusyDays] = useState<DashboardPayload['busyDays']>([])
  const [users, setUsers] = useState<Array<{ id: string; displayName: string; username: string }>>([])
  const [quickTitle, setQuickTitle] = useState('')
  const [quickAssigneeId, setQuickAssigneeId] = useState('')
  const [quickNotes, setQuickNotes] = useState('')
  const [quickDueDate, setQuickDueDate] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)
  const [gamification, setGamification] = useState<GamificationSummaryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [schedulerLoading, setSchedulerLoading] = useState(false)

  const total = useMemo(() => overdue.length + today.length, [overdue.length, today.length])

  async function loadDashboard() {
    setLoading(true)
    setActionError('')

    try {
      const [data, usersData, gamificationData] = await Promise.all([
        fetchJson<DashboardPayload>('/api/assignments?view=dashboard'),
        fetchJson<{ users: Array<{ id: string; displayName: string; username: string }> }>('/api/users'),
        fetchJson<GamificationSummaryPayload>('/api/gamification/summary'),
      ])
      setOverdue(data.overdue)
      setToday(data.today)
      setPriorityPlan(data.priorityPlan)
      setBusyDays(data.busyDays)
      setUsers(usersData.users)
      setGamification(gamificationData)
      if (!quickAssigneeId && usersData.users[0]) {
        setQuickAssigneeId(usersData.users[0].id)
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function createQuickAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim() || !quickAssigneeId) {
      setActionError('Enter a task and select an assignee.')
      return
    }

    setQuickLoading(true)
    setActionError('')

    try {
      await fetchJson('/api/assignments/quick', {
        method: 'POST',
        body: JSON.stringify({
          title: quickTitle,
          assignedToId: quickAssigneeId,
          dueDate: quickDueDate ? new Date(quickDueDate).toISOString() : null,
          notes: quickNotes || null,
        }),
      })

      setQuickTitle('')
      setQuickNotes('')
      setQuickDueDate('')
      await loadDashboard()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create quick assignment')
    } finally {
      setQuickLoading(false)
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

      {gamification && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Points and Streak</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-emerald-400/20 bg-zinc-950/40 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-100/80">Points</p>
              <p className="mt-1 text-xl font-semibold text-emerald-100">{gamification.currentUser.currentPoints}</p>
            </div>
            <div className="rounded-lg border border-emerald-400/20 bg-zinc-950/40 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-100/80">Current Streak</p>
              <p className="mt-1 text-xl font-semibold text-emerald-100">{gamification.currentUser.currentStreak}</p>
            </div>
            <div className="rounded-lg border border-emerald-400/20 bg-zinc-950/40 p-3">
              <p className="text-[11px] uppercase tracking-wide text-emerald-100/80">Best Streak</p>
              <p className="mt-1 text-xl font-semibold text-emerald-100">{gamification.currentUser.bestStreak}</p>
            </div>
          </div>
          {gamification.lastEarnedEvent && (
            <p className="mt-2 text-xs text-emerald-100/80">
              Last earned: +{gamification.lastEarnedEvent.pointsDelta} on{' '}
              {new Date(gamification.lastEarnedEvent.createdAt).toLocaleString()}
            </p>
          )}
          {gamification.household.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs uppercase tracking-wide text-emerald-100/70">Household Snapshot</p>
              {gamification.household.map((entry) => (
                <div key={entry.user.id} className="flex items-center justify-between rounded-lg border border-emerald-400/20 bg-zinc-950/40 px-3 py-2">
                  <p className="text-sm font-medium text-emerald-100">{entry.user.displayName}</p>
                  <p className="text-xs text-emerald-100/80">{entry.currentPoints} pts • streak {entry.currentStreak}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {priorityPlan.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Priority Sequence</h2>
          <p className="mt-1 text-xs text-zinc-400">If you have only 10 minutes, start with rank #1. Then continue in order.</p>
          <div className="mt-3 space-y-2">
            {priorityPlan.slice(0, 5).map((item) => (
              <div key={item.assignmentId} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">#{item.priorityRank} {item.taskName}</p>
                  <p className="text-xs text-zinc-400">
                    Urgency {item.urgencyPoints}/{item.urgencyBudgetTotal} pool • ~{item.estimatedMinutes} min • cumulative {item.cumulativeMinutes} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {busyDays.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200">Busy Days</h2>
          <p className="mt-1 text-xs text-amber-100/80">The assistant can treat these dates as overloaded when planning your day.</p>
          <div className="mt-3 space-y-2">
            {busyDays.map((day) => (
              <div key={day.date} className="rounded-lg border border-amber-400/20 bg-zinc-950/40 px-3 py-2">
                <p className="text-sm font-semibold text-amber-100">{new Date(day.date).toLocaleDateString()}</p>
                <p className="text-xs text-amber-100/80">
                  {day.reason} • {day.totalTasks} total tasks • ~{day.totalEstimatedMinutes} minutes • focus block: {day.recommendedFocusMinutes} min
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Quick Assign</h2>
        <p className="mt-1 text-xs text-zinc-400">Create and assign a task in one step (for example, folded clothes to put away).</p>

        <form className="mt-3 space-y-2" onSubmit={createQuickAssignment}>
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Task title"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <select
            value={quickAssigneeId}
            onChange={(e) => setQuickAssigneeId(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Assign to...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={quickDueDate}
            onChange={(e) => setQuickDueDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <input
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <button
            type="submit"
            disabled={quickLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {quickLoading ? 'Assigning...' : 'Create and Assign'}
          </button>
        </form>
      </section>

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
          <p className="mt-1 text-xs text-zinc-300">
            Urgency: {assignment.urgencyPoints}/{assignment.urgencyBudgetTotal} pool • Rank #{assignment.priorityRank}
          </p>
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
