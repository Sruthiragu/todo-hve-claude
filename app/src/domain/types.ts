export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  /** Trimmed, 1–200 characters. */
  title: string
  /** Empty string when absent, at most 2,000 characters. */
  description: string
  priority: Priority
  /** ISO 8601 UTC instant, or null when the task has no deadline. */
  dueAt: string | null
  /** False means `dueAt` is 23:59 local time on the chosen date. Always false when `dueAt` is null. */
  hasDueTime: boolean
  /** Trimmed, empty string when absent. */
  category: string
  completed: boolean
  /** ISO 8601 instant. */
  completedAt: string | null
  subtasks: Subtask[]
  /** ISO 8601 instant. */
  createdAt: string
  /** ISO 8601 instant. */
  updatedAt: string
}

export type ViewId = 'my-day' | 'upcoming' | 'overdue' | 'completed' | 'all'
export type StatusFilter = 'all' | 'active' | 'completed'
export type DueFilter = 'any' | 'overdue' | 'today' | 'upcoming' | 'none'
export type SortKey = 'created' | 'priority' | 'deadline'

export interface TaskQuery {
  search: string
  status: StatusFilter
  priority: Priority | 'all'
  /** null = all categories, '' = uncategorized, otherwise a category name. */
  category: string | null
  due: DueFilter
  sort: SortKey
}

/** The user-editable fields of a task, as submitted by a form. */
export interface TaskDraft {
  title: string
  description: string
  priority: Priority
  dueAt: string | null
  hasDueTime: boolean
  category: string
  subtasks: Subtask[]
}

export const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high', 'urgent']

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_RANK: Record<Priority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
}

export const VIEWS: readonly { id: ViewId; label: string; shortLabel: string }[] = [
  { id: 'my-day', label: 'My Day', shortLabel: 'My Day' },
  { id: 'upcoming', label: 'Upcoming', shortLabel: 'Upcoming' },
  { id: 'overdue', label: 'Overdue', shortLabel: 'Overdue' },
  { id: 'completed', label: 'Completed', shortLabel: 'Done' },
  { id: 'all', label: 'All Tasks', shortLabel: 'All' },
]

export const DEFAULT_QUERY: TaskQuery = {
  search: '',
  status: 'all',
  priority: 'all',
  category: null,
  due: 'any',
  sort: 'created',
}
