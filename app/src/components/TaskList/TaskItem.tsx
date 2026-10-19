import { useState } from 'react'
import { formatDeadline } from '../../domain/dates.ts'
import { subtaskProgress } from '../../domain/selectors.ts'
import { PRIORITY_LABEL } from '../../domain/types.ts'
import type { Task } from '../../domain/types.ts'
import { useTaskStore } from '../../state/taskStoreContext.ts'
import { useToast } from '../../state/toastContext.ts'
import { taskCheckboxId } from './taskIds.ts'

interface TaskItemProps {
  task: Task
  now: Date
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskItem({ task, now, onEdit, onDelete }: TaskItemProps) {
  const { toggleComplete, toggleSubtask } = useTaskStore()
  const { notify } = useToast()
  const [showSubtasks, setShowSubtasks] = useState(false)

  const checkboxId = taskCheckboxId(task.id)
  const subtaskListId = `task-${task.id}-subtasks`
  const deadline = formatDeadline(task, now)
  const progress = subtaskProgress(task)
  const progressText = `${progress.done} of ${progress.total} subtasks`
  const quotedTitle = `“${task.title}”`

  const onToggle = () => {
    const completing = !task.completed
    if (toggleComplete(task.id)) notify(completing ? 'Task completed' : 'Task reopened')
  }

  return (
    <li className="task-item" data-completed={task.completed || undefined}>
      <label className="task-item__check" htmlFor={checkboxId}>
        <input
          id={checkboxId}
          type="checkbox"
          className="checkbox"
          checked={task.completed}
          onChange={onToggle}
          aria-label={task.completed ? `Mark ${quotedTitle} incomplete` : `Mark ${quotedTitle} complete`}
        />
      </label>

      <div className="task-item__body">
        <p className="task-item__title">{task.title}</p>
        {task.description !== '' && <p className="task-item__description">{task.description}</p>}

        <div className="task-item__meta">
          <span className={`badge badge--${task.priority}`}>
            <span className="visually-hidden">Priority: </span>
            {PRIORITY_LABEL[task.priority]}
          </span>
          {deadline && (
            <time className={`deadline deadline--${deadline.tone}`} dateTime={task.dueAt ?? undefined} title={deadline.full}>
              {deadline.label}
            </time>
          )}
          {task.category !== '' && (
            <span className="chip">
              <span className="visually-hidden">Category: </span>
              {task.category}
            </span>
          )}
          {progress.total > 0 && (
            <button
              type="button"
              className="task-item__subtask-toggle"
              aria-expanded={showSubtasks}
              aria-controls={subtaskListId}
              aria-label={`${progressText} for ${quotedTitle}`}
              onClick={() => setShowSubtasks((open) => !open)}
            >
              <span aria-hidden="true" className="task-item__chevron">
                {showSubtasks ? '▾' : '▸'}
              </span>
              {progressText}
            </button>
          )}
        </div>

        {progress.total > 0 && (
          <ul id={subtaskListId} className="subtask-checklist" hidden={!showSubtasks}>
            {task.subtasks.map((subtask) => (
              <li key={subtask.id}>
                <label className="subtask-checklist__item" data-completed={subtask.completed || undefined}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={subtask.completed}
                    onChange={() => toggleSubtask(task.id, subtask.id)}
                    aria-label={`Mark “${subtask.title}” in ${quotedTitle} ${subtask.completed ? 'incomplete' : 'complete'}`}
                  />
                  <span>{subtask.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="task-item__actions">
        <button type="button" className="btn btn--ghost btn--small" aria-label={`Edit ${quotedTitle}`} onClick={() => onEdit(task)}>
          Edit
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--small task-item__delete"
          aria-label={`Delete ${quotedTitle}`}
          onClick={() => onDelete(task)}
        >
          Delete
        </button>
      </div>
    </li>
  )
}
