import { PRIORITIES } from '../domain/types.ts'
import type { Priority, Subtask, Task } from '../domain/types.ts'
import { LIMITS } from '../domain/validation.ts'

/** Full ISO 8601 instants only; a date-only string is never accepted. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/

export interface GuardResult<T> {
  value: T
  /** True when the record was valid only after repairing small inconsistencies. */
  repaired: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoInstant(value: unknown): value is string {
  return typeof value === 'string' && ISO_INSTANT.test(value) && !Number.isNaN(Date.parse(value))
}

function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)
}

/** Returns the trimmed title when it is a string of valid length, otherwise null. */
function readTitle(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length >= 1 && trimmed.length <= max ? trimmed : null
}

export function readSubtask(value: unknown): GuardResult<Subtask> | null {
  if (!isRecord(value)) return null
  const { id, title, completed } = value
  if (typeof id !== 'string' || id === '' || typeof completed !== 'boolean') return null
  const cleanTitle = readTitle(title, LIMITS.subtaskTitleMax)
  if (cleanTitle === null) return null
  return { value: { id, title: cleanTitle, completed }, repaired: cleanTitle !== title }
}

/**
 * Checks an unknown value against the Task shape. Invalid records return
 * null. Repairable inconsistencies are fixed and reported as `repaired`.
 */
export function readTask(value: unknown): GuardResult<Task> | null {
  if (!isRecord(value)) return null
  const { id, title, description, priority, dueAt, hasDueTime, category, completed, completedAt, subtasks, createdAt, updatedAt } = value

  if (typeof id !== 'string' || id === '') return null
  const cleanTitle = readTitle(title, LIMITS.titleMax)
  if (cleanTitle === null) return null
  if (typeof description !== 'string' || description.length > LIMITS.descriptionMax) return null
  if (!isPriority(priority)) return null
  const cleanDueAt = dueAt === null ? null : isIsoInstant(dueAt) ? dueAt : undefined
  if (cleanDueAt === undefined) return null
  if (typeof hasDueTime !== 'boolean') return null
  if (typeof category !== 'string') return null
  if (typeof completed !== 'boolean') return null
  const cleanCompletedAt = completedAt === null ? null : isIsoInstant(completedAt) ? completedAt : undefined
  if (cleanCompletedAt === undefined) return null
  if (!Array.isArray(subtasks)) return null
  if (!isIsoInstant(createdAt) || !isIsoInstant(updatedAt)) return null

  let repaired = cleanTitle !== title

  const cleanHasDueTime = cleanDueAt === null ? false : hasDueTime
  if (cleanHasDueTime !== hasDueTime) repaired = true

  let cleanCategory = category.trim()
  if (cleanCategory.length > LIMITS.categoryMax) cleanCategory = cleanCategory.slice(0, LIMITS.categoryMax).trim()
  if (cleanCategory !== category) repaired = true

  const finalCompletedAt = completed ? cleanCompletedAt : null
  if (finalCompletedAt !== cleanCompletedAt) repaired = true

  const cleanSubtasks: Subtask[] = []
  const subtaskIds = new Set<string>()
  for (const item of subtasks) {
    const result = readSubtask(item)
    if (!result || subtaskIds.has(result.value.id)) {
      repaired = true
      continue
    }
    subtaskIds.add(result.value.id)
    cleanSubtasks.push(result.value)
    if (result.repaired) repaired = true
  }

  return {
    value: {
      id,
      title: cleanTitle,
      description,
      priority,
      dueAt: cleanDueAt,
      hasDueTime: cleanHasDueTime,
      category: cleanCategory,
      completed,
      completedAt: finalCompletedAt,
      subtasks: cleanSubtasks,
      createdAt,
      updatedAt,
    },
    repaired,
  }
}
