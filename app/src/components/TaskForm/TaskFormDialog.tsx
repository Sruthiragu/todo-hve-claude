import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { fromDueAt, toDueAt } from '../../domain/dates.ts'
import { LIMITS, validateSubtaskTitle, validateTaskInput } from '../../domain/validation.ts'
import type { TaskInput, TaskInputErrors } from '../../domain/validation.ts'
import { PRIORITIES, PRIORITY_LABEL } from '../../domain/types.ts'
import type { Priority, Subtask, Task } from '../../domain/types.ts'
import { useTaskStore } from '../../state/taskStoreContext.ts'
import { useToast } from '../../state/toastContext.ts'
import { SubtaskEditor } from './SubtaskEditor.tsx'
import './TaskForm.css'

interface TaskFormDialogProps {
  /** null creates a new task; otherwise edits this task. */
  task: Task | null
  categories: string[]
  onClose: () => void
}

interface Draft {
  title: string
  description: string
  priority: Priority
  date: string
  time: string
  category: string
  subtasks: Subtask[]
}

const FIELD_ORDER: (keyof TaskInput)[] = ['title', 'description', 'date', 'time', 'category']

function initialDraft(task: Task | null): Draft {
  if (!task) return { title: '', description: '', priority: 'medium', date: '', time: '', category: '', subtasks: [] }
  const { date, time } = fromDueAt(task.dueAt, task.hasDueTime)
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    date,
    time,
    category: task.category,
    subtasks: task.subtasks,
  }
}

export function TaskFormDialog({ task, categories, onClose }: TaskFormDialogProps) {
  const { createTask, updateTask } = useTaskStore()
  const { notify } = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const submittingRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState(() => initialDraft(task))
  const [errors, setErrors] = useState<TaskInputErrors>({})
  const [subtaskErrors, setSubtaskErrors] = useState<Record<string, string>>({})
  const uid = useId()
  const fieldId = (field: string) => `${uid}-${field}`
  const errorId = (field: string) => `${uid}-${field}-error`
  const isEdit = task !== null
  const headingId = fieldId('heading')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const onDateChange = (date: string) => {
    // Clearing the date also clears the time.
    setDraft((current) => ({ ...current, date, time: date === '' ? '' : current.time }))
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return

    const fieldErrors = validateTaskInput(draft)
    const nextSubtaskErrors: Record<string, string> = {}
    for (const subtask of draft.subtasks) {
      const message = validateSubtaskTitle(subtask.title)
      if (message) nextSubtaskErrors[subtask.id] = message
    }
    setErrors(fieldErrors)
    setSubtaskErrors(nextSubtaskErrors)

    const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field] !== undefined)
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus()
      return
    }
    const firstInvalidSubtask = draft.subtasks.find((subtask) => nextSubtaskErrors[subtask.id] !== undefined)
    if (firstInvalidSubtask) {
      document.getElementById(`${uid}-subtask-${firstInvalidSubtask.id}`)?.focus()
      return
    }

    const deadline = draft.date === '' ? null : toDueAt(draft.date, draft.time)
    const input = {
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      dueAt: deadline?.dueAt ?? null,
      hasDueTime: deadline?.hasDueTime ?? false,
      category: draft.category,
      subtasks: draft.subtasks,
    }

    submittingRef.current = true
    setSubmitting(true)
    const ok = task ? updateTask(task.id, input) : createTask(input)
    if (ok) {
      notify(isEdit ? 'Changes saved' : 'Task added')
      onClose()
      return
    }
    // The store already showed the error; keep the draft so nothing is lost.
    submittingRef.current = false
    setSubmitting(false)
  }

  const describedBy = (field: keyof TaskInput, hint?: string) =>
    [hint, errors[field] ? errorId(field) : undefined].filter(Boolean).join(' ') || undefined

  const fieldError = (field: keyof TaskInput) =>
    errors[field] ? (
      <p id={errorId(field)} className="field-error">
        {errors[field]}
      </p>
    ) : null

  return (
    <dialog
      ref={dialogRef}
      className="task-form-dialog"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <form className="task-form" onSubmit={onSubmit} noValidate>
        <h2 id={headingId} className="task-form__heading">
          {isEdit ? 'Edit task' : 'Add task'}
        </h2>

        <div className="field">
          <label className="field__label" htmlFor={fieldId('title')}>
            Title
          </label>
          <input
            id={fieldId('title')}
            className="input"
            value={draft.title}
            onChange={(event) => update('title', event.target.value)}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={describedBy('title')}
            autoComplete="off"
            autoFocus
            required
          />
          {fieldError('title')}
        </div>

        <div className="field">
          <label className="field__label" htmlFor={fieldId('description')}>
            Description <span className="field__optional">(optional)</span>
          </label>
          <textarea
            id={fieldId('description')}
            className="input"
            value={draft.description}
            maxLength={LIMITS.descriptionMax}
            onChange={(event) => update('description', event.target.value)}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={describedBy('description', fieldId('description-count'))}
          />
          <p id={fieldId('description-count')} className="field__hint task-form__counter">
            {draft.description.length} / {LIMITS.descriptionMax}
            {draft.description.length >= LIMITS.descriptionMax && (
              <span role="status"> — character limit reached</span>
            )}
          </p>
          {fieldError('description')}
        </div>

        <div className="task-form__row">
          <div className="field">
            <label className="field__label" htmlFor={fieldId('priority')}>
              Priority
            </label>
            <select
              id={fieldId('priority')}
              className="input"
              value={draft.priority}
              onChange={(event) => update('priority', event.target.value as Priority)}
            >
              {[...PRIORITIES].reverse().map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABEL[priority]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={fieldId('category')}>
              Category <span className="field__optional">(optional)</span>
            </label>
            <input
              id={fieldId('category')}
              className="input"
              list={fieldId('category-options')}
              value={draft.category}
              onChange={(event) => update('category', event.target.value)}
              aria-invalid={errors.category ? true : undefined}
              aria-describedby={describedBy('category')}
              autoComplete="off"
            />
            <datalist id={fieldId('category-options')}>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            {fieldError('category')}
          </div>
        </div>

        <fieldset className="task-form__deadline">
          <legend className="field__label">
            Deadline <span className="field__optional">(optional)</span>
          </legend>
          <div className="task-form__row">
            <div className="field">
              <label className="field__label" htmlFor={fieldId('date')}>
                Date
              </label>
              <div className="task-form__inline">
                <input
                  id={fieldId('date')}
                  type="date"
                  className="input"
                  value={draft.date}
                  onChange={(event) => onDateChange(event.target.value)}
                  aria-invalid={errors.date ? true : undefined}
                  aria-describedby={describedBy('date')}
                />
                {draft.date !== '' && (
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => onDateChange('')}>
                    Clear
                  </button>
                )}
              </div>
              {fieldError('date')}
            </div>
            <div className="field">
              <label className="field__label" htmlFor={fieldId('time')}>
                Time
              </label>
              <input
                id={fieldId('time')}
                type="time"
                className="input"
                value={draft.time}
                disabled={draft.date === ''}
                onChange={(event) => update('time', event.target.value)}
                aria-invalid={errors.time ? true : undefined}
                aria-describedby={describedBy('time', fieldId('time-hint'))}
              />
              <p id={fieldId('time-hint')} className="field__hint">
                {draft.date === '' ? 'Pick a date first.' : 'Leave empty to make it due at 23:59.'}
              </p>
              {fieldError('time')}
            </div>
          </div>
        </fieldset>

        <SubtaskEditor
          idPrefix={`${uid}-subtask`}
          subtasks={draft.subtasks}
          errors={subtaskErrors}
          onChange={(subtasks) => update('subtasks', subtasks)}
          onErrorsChange={setSubtaskErrors}
        />

        <div className="task-form__actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {isEdit ? 'Save changes' : 'Add task'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
