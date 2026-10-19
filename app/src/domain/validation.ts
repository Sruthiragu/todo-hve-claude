import { parseDateInput, parseTimeInput } from './dates.ts'

export const LIMITS = {
  titleMax: 200,
  descriptionMax: 2000,
  subtaskTitleMax: 200,
  categoryMax: 50,
} as const

export interface TaskInput {
  title: string
  description: string
  date: string
  time: string
  category: string
}

export type TaskInputErrors = Partial<Record<keyof TaskInput, string>>

/** Field-level error messages for task input. An empty object means the input is valid. */
export function validateTaskInput(input: TaskInput): TaskInputErrors {
  const errors: TaskInputErrors = {}

  const title = input.title.trim()
  if (title.length === 0) errors.title = 'Enter a title.'
  else if (title.length > LIMITS.titleMax) errors.title = `Title must be ${LIMITS.titleMax} characters or fewer.`

  if (input.description.length > LIMITS.descriptionMax) {
    errors.description = 'Description must be 2,000 characters or fewer.'
  }

  if (input.date !== '' && !parseDateInput(input.date)) errors.date = 'Enter a valid date.'

  if (input.time !== '') {
    if (input.date === '') errors.time = 'Add a date to set a time.'
    else if (!parseTimeInput(input.time)) errors.time = 'Enter a valid time.'
  }

  if (input.category.trim().length > LIMITS.categoryMax) {
    errors.category = `Category must be ${LIMITS.categoryMax} characters or fewer.`
  }

  return errors
}

/** Returns an error message, or null when the subtask title is valid. */
export function validateSubtaskTitle(title: string): string | null {
  const trimmed = title.trim()
  if (trimmed.length === 0) return 'Enter a subtask title.'
  if (trimmed.length > LIMITS.subtaskTitleMax) {
    return `Subtask title must be ${LIMITS.subtaskTitleMax} characters or fewer.`
  }
  return null
}
