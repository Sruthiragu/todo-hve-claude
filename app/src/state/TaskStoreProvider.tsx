import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createId } from '../domain/id.ts'
import type { Task, TaskDraft } from '../domain/types.ts'
import { loadTasks, saveTasks } from '../storage/index.ts'
import { TaskStoreContext } from './taskStoreContext.ts'
import type { TaskStore } from './taskStoreContext.ts'
import { tasksReducer } from './tasksReducer.ts'
import type { TaskAction } from './tasksReducer.ts'
import { useToast } from './toastContext.ts'

function normalizeDraft(draft: TaskDraft): TaskDraft {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim() === '' ? '' : draft.description,
    category: draft.category.trim(),
    hasDueTime: draft.dueAt === null ? false : draft.hasDueTime,
    subtasks: draft.subtasks.map((subtask) => ({ ...subtask, title: subtask.title.trim() })),
  }
}

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast()
  // Load exactly once, synchronously, and never write during startup.
  const [loadResult] = useState(loadTasks)
  const [tasks, setTasks] = useState<Task[]>(loadResult.tasks)
  const tasksRef = useRef<Task[]>(loadResult.tasks)

  const dispatch = useCallback(
    (action: TaskAction): boolean => {
      const current = tasksRef.current
      const next = tasksReducer(current, action)
      if (next === current) return true
      // Saving happens outside any state updater, so StrictMode cannot save twice.
      const result = saveTasks(next)
      if (!result.ok) {
        notify(result.error, 'error')
        return false
      }
      tasksRef.current = next
      setTasks(next)
      return true
    },
    [notify],
  )

  const createTask = useCallback(
    (draft: TaskDraft) => {
      const at = new Date().toISOString()
      const task: Task = {
        ...normalizeDraft(draft),
        id: createId(),
        completed: false,
        completedAt: null,
        createdAt: at,
        updatedAt: at,
      }
      return dispatch({ type: 'create', task })
    },
    [dispatch],
  )

  const updateTask = useCallback(
    (id: string, draft: TaskDraft) =>
      dispatch({ type: 'update', id, changes: normalizeDraft(draft), at: new Date().toISOString() }),
    [dispatch],
  )

  const toggleComplete = useCallback(
    (id: string) => dispatch({ type: 'toggleComplete', id, at: new Date().toISOString() }),
    [dispatch],
  )

  const deleteTask = useCallback((id: string) => dispatch({ type: 'delete', id }), [dispatch])

  const toggleSubtask = useCallback(
    (id: string, subtaskId: string) =>
      dispatch({ type: 'toggleSubtask', id, subtaskId, at: new Date().toISOString() }),
    [dispatch],
  )

  const store = useMemo<TaskStore>(
    () => ({ tasks, loadResult, dispatch, createTask, updateTask, toggleComplete, deleteTask, toggleSubtask }),
    [tasks, loadResult, dispatch, createTask, updateTask, toggleComplete, deleteTask, toggleSubtask],
  )

  return <TaskStoreContext.Provider value={store}>{children}</TaskStoreContext.Provider>
}
