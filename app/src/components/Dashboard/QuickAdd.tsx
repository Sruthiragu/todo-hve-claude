import { useId, useRef, useState } from 'react'
import type { FormEvent, Ref } from 'react'
import { toDueAt, todayInputValue } from '../../domain/dates.ts'
import type { ViewId } from '../../domain/types.ts'
import { validateTaskInput } from '../../domain/validation.ts'
import { useTaskStore } from '../../state/taskStoreContext.ts'
import { useToast } from '../../state/toastContext.ts'
import './Dashboard.css'

/**
 * A repeat submit right after a successful add (double Enter or double click)
 * is ignored instead of creating a duplicate or flagging the cleared field.
 */
const REPEAT_WINDOW_MS = 1000

interface QuickAddProps {
  ref?: Ref<HTMLInputElement>
  view: ViewId
  now: Date
}

/**
 * Creates a medium-priority task from a title. In My Day the task is due
 * today with no time, so it stays in view; elsewhere it has no deadline.
 */
export function QuickAdd({ ref, view, now }: QuickAddProps) {
  const { createTask } = useTaskStore()
  const { notify } = useToast()
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const lastAdded = useRef({ title: '', at: 0 })
  const id = useId()
  const errorId = `${id}-error`

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return
    const trimmed = title.trim()
    const isRepeat = trimmed === '' || trimmed === lastAdded.current.title
    if (isRepeat && Date.now() - lastAdded.current.at < REPEAT_WINDOW_MS) return

    const message = validateTaskInput({ title, description: '', date: '', time: '', category: '' }).title ?? null
    setError(message)
    if (message) return

    const deadline = view === 'my-day' ? toDueAt(todayInputValue(now), '') : null
    submittingRef.current = true
    const ok = createTask({
      title,
      description: '',
      priority: 'medium',
      dueAt: deadline?.dueAt ?? null,
      hasDueTime: false,
      category: '',
      subtasks: [],
    })
    submittingRef.current = false
    if (!ok) return
    lastAdded.current = { title: trimmed, at: Date.now() }
    setTitle('')
    notify(deadline ? 'Task added to My Day, due today' : 'Task added to All Tasks')
  }

  return (
    <form className="quick-add" onSubmit={onSubmit} noValidate>
      <label className="field__label" htmlFor={id}>
        Add a task
      </label>
      <div className="quick-add__row">
        <input
          ref={ref}
          id={id}
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={view === 'my-day' ? 'Due today, press Enter to add' : 'Press Enter to add'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary">
          Add
        </button>
      </div>
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </form>
  )
}
