/**
 * Date and time handling for task deadlines.
 *
 * Timezone strategy: deadlines are entered and shown in the user's local
 * browser timezone and stored as ISO 8601 UTC instants (`toISOString()`).
 * "Today" means the user's local calendar day. A deadline with a date but no
 * time is due at 23:59 local time on that date and is stored with
 * `hasDueTime: false`.
 *
 * Local dates are always built from numeric parts. Never pass a date-only
 * `YYYY-MM-DD` string to `new Date()` or `Date.parse`: both parse it as UTC
 * midnight, which shifts the day for users west of UTC.
 *
 * Every function that depends on the current time takes `now` as a
 * parameter; none reads the clock itself.
 */
import type { Task } from './types.ts'

export interface DateParts {
  year: number
  /** 1–12 */
  month: number
  day: number
}

export interface TimeParts {
  hours: number
  minutes: number
}

export type DeadlineTone = 'overdue' | 'today' | 'soon' | 'later' | 'done'

type Deadline = Pick<Task, 'dueAt'>

const DATE_INPUT = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_INPUT = /^(\d{2}):(\d{2})$/
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const pad = (value: number) => String(value).padStart(2, '0')

/** Parses a `YYYY-MM-DD` input value. Returns null when it is not a real calendar date. */
export function parseDateInput(value: string): DateParts | null {
  const match = DATE_INPUT.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const built = new Date(year, month - 1, day)
  if (built.getFullYear() !== year || built.getMonth() !== month - 1 || built.getDate() !== day) {
    return null
  }
  return { year, month, day }
}

/** Parses an `HH:mm` input value. */
export function parseTimeInput(value: string): TimeParts | null {
  const match = TIME_INPUT.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

/**
 * Converts form input to a stored deadline. A date without a time becomes
 * 23:59 local on that date. Returns null for invalid input.
 */
export function toDueAt(date: string, time: string): { dueAt: string; hasDueTime: boolean } | null {
  const day = parseDateInput(date)
  if (!day) return null
  const hasDueTime = time !== ''
  const clock = hasDueTime ? parseTimeInput(time) : { hours: 23, minutes: 59 }
  if (!clock) return null
  const local = new Date(day.year, day.month - 1, day.day, clock.hours, clock.minutes, 0, 0)
  return { dueAt: local.toISOString(), hasDueTime }
}

/** Converts a stored deadline back to local `date` and `time` input values. */
export function fromDueAt(dueAt: string | null, hasDueTime: boolean): { date: string; time: string } {
  if (dueAt === null) return { date: '', time: '' }
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return { date: '', time: '' }
  return {
    date: toDateInputValue(due),
    time: hasDueTime ? `${pad(due.getHours())}:${pad(due.getMinutes())}` : '',
  }
}

/** The local `YYYY-MM-DD` value of a moment. */
export function toDateInputValue(moment: Date): string {
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`
}

/** Today's local date as a date input value. */
export function todayInputValue(now: Date): string {
  return toDateInputValue(now)
}

export function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function startOfTomorrow(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
}

function dueTime(task: Deadline): number | null {
  if (task.dueAt === null) return null
  const time = Date.parse(task.dueAt)
  return Number.isNaN(time) ? null : time
}

/** Due within the local calendar day of `now`, regardless of completion. */
export function isDueToday(task: Deadline, now: Date): boolean {
  const time = dueTime(task)
  return time !== null && time >= startOfLocalDay(now).getTime() && time < startOfTomorrow(now).getTime()
}

/** Due on or after local midnight tomorrow, regardless of completion. */
export function isUpcoming(task: Deadline, now: Date): boolean {
  const time = dueTime(task)
  return time !== null && time >= startOfTomorrow(now).getTime()
}

/** Incomplete and past its deadline. A task without a deadline is never overdue. */
export function isOverdue(task: Pick<Task, 'dueAt' | 'completed'>, now: Date): boolean {
  return !task.completed && task.dueAt !== null && Date.parse(task.dueAt) < now.getTime()
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
const dateWithYearFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const fullFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' })
const fullWithTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' })

function formatElapsed(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / MINUTE))} min`
  if (ms < 2 * DAY) return `${Math.floor(ms / HOUR)} h`
  return `${Math.floor(ms / DAY)} d`
}

function describeDay(due: Date, now: Date): string {
  const today = startOfLocalDay(now)
  const dueDay = startOfLocalDay(due)
  const tomorrow = startOfTomorrow(now)
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (dueDay.getTime() === today.getTime()) return 'Today'
  if (dueDay.getTime() === tomorrow.getTime()) return 'Tomorrow'
  if (dueDay.getTime() === yesterday.getTime()) return 'Yesterday'
  return due.getFullYear() === now.getFullYear() ? dateFormat.format(due) : dateWithYearFormat.format(due)
}

/**
 * A short deadline label and tone for display, for example "Today · 14:30",
 * "Tomorrow" or "Overdue · 2 h". Returns null when the task has no deadline.
 */
export function formatDeadline(
  task: Pick<Task, 'dueAt' | 'hasDueTime' | 'completed'>,
  now: Date,
): { label: string; tone: DeadlineTone; full: string } | null {
  if (task.dueAt === null) return null
  const due = new Date(task.dueAt)
  if (Number.isNaN(due.getTime())) return null
  const time = task.hasDueTime ? ` · ${timeFormat.format(due)}` : ''
  const full = `Due ${(task.hasDueTime ? fullWithTimeFormat : fullFormat).format(due)}`
  const day = describeDay(due, now)

  if (task.completed) return { label: `${day}${time}`, tone: 'done', full }
  if (isOverdue(task, now)) {
    return { label: `Overdue · ${formatElapsed(now.getTime() - due.getTime())}`, tone: 'overdue', full }
  }
  if (isDueToday(task, now)) return { label: `Today${time}`, tone: 'today', full }
  if (day === 'Tomorrow') return { label: `Tomorrow${time}`, tone: 'soon', full }
  return { label: `${day}${time}`, tone: 'later', full }
}
