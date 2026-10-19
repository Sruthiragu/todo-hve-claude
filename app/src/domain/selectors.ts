import { isDueToday, isOverdue, isUpcoming } from './dates.ts'
import { PRIORITY_RANK, VIEWS } from './types.ts'
import type { SortKey, Task, TaskQuery, ViewId } from './types.ts'

/** View membership (D-01). Counts and lists both use this predicate. */
function inView(task: Task, view: ViewId, now: Date): boolean {
  switch (view) {
    case 'my-day':
      return isDueToday(task, now)
    case 'upcoming':
      return isUpcoming(task, now)
    case 'overdue':
      return isOverdue(task, now)
    case 'completed':
      return task.completed
    case 'all':
      return true
  }
}

export function selectView(tasks: Task[], view: ViewId, now: Date): Task[] {
  return tasks.filter((task) => inView(task, view, now))
}

export function viewCounts(tasks: Task[], now: Date): Record<ViewId, number> {
  const counts: Record<ViewId, number> = { 'my-day': 0, upcoming: 0, overdue: 0, completed: 0, all: 0 }
  for (const { id } of VIEWS) counts[id] = selectView(tasks, id, now).length
  return counts
}

export function matchesSearch(task: Task, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (q === '') return true
  return task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q)
}

export function matchesFilters(task: Task, query: TaskQuery, now: Date): boolean {
  if (query.status === 'active' && task.completed) return false
  if (query.status === 'completed' && !task.completed) return false
  if (query.priority !== 'all' && task.priority !== query.priority) return false
  if (query.category !== null && task.category !== query.category) return false
  switch (query.due) {
    case 'overdue':
      return isOverdue(task, now)
    case 'today':
      return isDueToday(task, now)
    case 'upcoming':
      return isUpcoming(task, now)
    case 'none':
      return task.dueAt === null
    case 'any':
      return true
  }
}

const createdTime = (task: Task) => Date.parse(task.createdAt)
const dueTime = (task: Task) => (task.dueAt === null ? Number.POSITIVE_INFINITY : Date.parse(task.dueAt))

function compareNumbers(a: number, b: number): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function tieBreak(a: Task, b: Task): number {
  return compareNumbers(createdTime(b), createdTime(a)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/** A stable, deterministic comparator. Tasks without a deadline sort after those with one. */
export function compareTasks(sort: SortKey): (a: Task, b: Task) => number {
  switch (sort) {
    case 'created':
      return tieBreak
    case 'priority':
      return (a, b) =>
        compareNumbers(PRIORITY_RANK[b.priority], PRIORITY_RANK[a.priority]) ||
        compareNumbers(dueTime(a), dueTime(b)) ||
        tieBreak(a, b)
    case 'deadline':
      return (a, b) => compareNumbers(dueTime(a), dueTime(b)) || tieBreak(a, b)
  }
}

/** The visible list: view → search → filters → sort, always in that order. */
export function queryTasks(tasks: Task[], view: ViewId, query: TaskQuery, now: Date): Task[] {
  return selectView(tasks, view, now)
    .filter((task) => matchesSearch(task, query.search))
    .filter((task) => matchesFilters(task, query, now))
    .sort(compareTasks(query.sort))
}

/** Completed out of all tasks due today (D-02). */
export function dailyProgress(tasks: Task[], now: Date): { done: number; total: number } {
  const today = selectView(tasks, 'my-day', now)
  return { done: today.filter((task) => task.completed).length, total: today.length }
}

export function subtaskProgress(task: Task): { done: number; total: number } {
  return { done: task.subtasks.filter((subtask) => subtask.completed).length, total: task.subtasks.length }
}

/** Distinct non-empty categories, sorted, and whether any task is uncategorized. */
export function categoryOptions(tasks: Task[]): { names: string[]; hasUncategorized: boolean } {
  const names = new Set<string>()
  let hasUncategorized = false
  for (const task of tasks) {
    if (task.category === '') hasUncategorized = true
    else names.add(task.category)
  }
  return { names: [...names].sort((a, b) => a.localeCompare(b)), hasUncategorized }
}

export function isDefaultFilters(query: TaskQuery): boolean {
  return (
    query.search.trim() === '' &&
    query.status === 'all' &&
    query.priority === 'all' &&
    query.category === null &&
    query.due === 'any'
  )
}
