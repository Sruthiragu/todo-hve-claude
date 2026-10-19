import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createId } from '../../domain/id.ts'
import { validateSubtaskTitle } from '../../domain/validation.ts'
import type { Subtask } from '../../domain/types.ts'

interface SubtaskEditorProps {
  idPrefix: string
  subtasks: Subtask[]
  /** Error messages keyed by subtask id. */
  errors: Record<string, string>
  onChange: (subtasks: Subtask[]) => void
  onErrorsChange: (errors: Record<string, string>) => void
}

/** Edits the draft's subtasks; changes are saved together with the task. */
export function SubtaskEditor({ idPrefix, subtasks, errors, onChange, onErrorsChange }: SubtaskEditorProps) {
  const [newTitle, setNewTitle] = useState('')
  const [newError, setNewError] = useState<string | null>(null)
  const newInputId = `${idPrefix}-new`
  const newErrorId = `${idPrefix}-new-error`

  const setError = (id: string, message: string | null) => {
    const next = { ...errors }
    if (message) next[id] = message
    else delete next[id]
    onErrorsChange(next)
  }

  const add = () => {
    if (newTitle.trim() === '') {
      setNewError(null)
      return
    }
    const message = validateSubtaskTitle(newTitle)
    setNewError(message)
    if (message) return
    onChange([...subtasks, { id: createId(), title: newTitle.trim(), completed: false }])
    setNewTitle('')
  }

  const onNewKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    // Enter adds a subtask instead of submitting the whole form.
    event.preventDefault()
    add()
  }

  const change = (id: string, patch: Partial<Subtask>) => {
    onChange(subtasks.map((subtask) => (subtask.id === id ? { ...subtask, ...patch } : subtask)))
  }

  const remove = (id: string) => {
    onChange(subtasks.filter((subtask) => subtask.id !== id))
    setError(id, null)
  }

  return (
    <fieldset className="subtask-editor">
      <legend className="field__label">
        Subtasks <span className="field__optional">(optional)</span>
      </legend>

      {subtasks.length > 0 && (
        <ul className="subtask-editor__list">
          {subtasks.map((subtask) => {
            const inputId = `${idPrefix}-${subtask.id}`
            const errorId = `${inputId}-error`
            const name = subtask.title.trim() === '' ? 'untitled subtask' : `“${subtask.title.trim()}”`
            return (
              <li key={subtask.id} className="subtask-editor__row">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={subtask.completed}
                  onChange={() => change(subtask.id, { completed: !subtask.completed })}
                  aria-label={`Mark ${name} complete`}
                />
                <div className="subtask-editor__title">
                  <label className="visually-hidden" htmlFor={inputId}>
                    Subtask title
                  </label>
                  <input
                    id={inputId}
                    className="input"
                    value={subtask.title}
                    onChange={(event) => change(subtask.id, { title: event.target.value })}
                    onBlur={() => setError(subtask.id, validateSubtaskTitle(subtask.title))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.preventDefault()
                    }}
                    aria-invalid={errors[subtask.id] ? true : undefined}
                    aria-describedby={errors[subtask.id] ? errorId : undefined}
                    autoComplete="off"
                  />
                  {errors[subtask.id] && (
                    <p id={errorId} className="field-error">
                      {errors[subtask.id]}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--small subtask-editor__delete"
                  onClick={() => remove(subtask.id)}
                  aria-label={`Delete subtask ${name}`}
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="subtask-editor__new">
        <label className="visually-hidden" htmlFor={newInputId}>
          New subtask
        </label>
        <input
          id={newInputId}
          className="input"
          placeholder="Add a subtask"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={onNewKeyDown}
          aria-invalid={newError ? true : undefined}
          aria-describedby={newError ? newErrorId : undefined}
          autoComplete="off"
        />
        <button type="button" className="btn" onClick={add}>
          Add
        </button>
      </div>
      {newError && (
        <p id={newErrorId} className="field-error">
          {newError}
        </p>
      )}
    </fieldset>
  )
}
