import type { Subtask, Task } from '../domain/types.ts'

export type TaskChanges = Partial<
  Pick<Task, 'title' | 'description' | 'priority' | 'dueAt' | 'hasDueTime' | 'category' | 'subtasks'>
>

/** IDs and timestamps are created by the caller, so transitions stay deterministic. */
export type TaskAction =
  | { type: 'create'; task: Task }
  | { type: 'update'; id: string; changes: TaskChanges; at: string }
  | { type: 'toggleComplete'; id: string; at: string }
  | { type: 'delete'; id: string }
  | { type: 'addSubtask'; id: string; subtask: Subtask; at: string }
  | { type: 'renameSubtask'; id: string; subtaskId: string; title: string; at: string }
  | { type: 'toggleSubtask'; id: string; subtaskId: string; at: string }
  | { type: 'deleteSubtask'; id: string; subtaskId: string; at: string }

/** Applies `change` to the task with `id`. Returns the same array when no task matches. */
function updateById(tasks: Task[], id: string, change: (task: Task) => Task): Task[] {
  let found = false
  const next = tasks.map((task) => {
    if (task.id !== id) return task
    found = true
    return change(task)
  })
  return found ? next : tasks
}

function updateSubtasks(tasks: Task[], id: string, at: string, change: (subtasks: Subtask[]) => Subtask[]): Task[] {
  return updateById(tasks, id, (task) => ({ ...task, subtasks: change(task.subtasks), updatedAt: at }))
}

/** Pure state transitions. Returns the same array reference for a no-op. */
export function tasksReducer(tasks: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case 'create':
      if (tasks.some((task) => task.id === action.task.id)) return tasks
      return [...tasks, action.task]
    case 'update':
      return updateById(tasks, action.id, (task) => {
        const next = { ...task, ...action.changes, updatedAt: action.at }
        if (next.dueAt === null) next.hasDueTime = false
        return next
      })
    case 'toggleComplete':
      return updateById(tasks, action.id, (task) => ({
        ...task,
        completed: !task.completed,
        completedAt: task.completed ? null : action.at,
        updatedAt: action.at,
      }))
    case 'delete': {
      const next = tasks.filter((task) => task.id !== action.id)
      return next.length === tasks.length ? tasks : next
    }
    case 'addSubtask':
      return updateSubtasks(tasks, action.id, action.at, (subtasks) => [...subtasks, action.subtask])
    case 'renameSubtask':
      return updateSubtasks(tasks, action.id, action.at, (subtasks) =>
        subtasks.map((subtask) => (subtask.id === action.subtaskId ? { ...subtask, title: action.title } : subtask)),
      )
    case 'toggleSubtask':
      return updateSubtasks(tasks, action.id, action.at, (subtasks) =>
        subtasks.map((subtask) =>
          subtask.id === action.subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
        ),
      )
    case 'deleteSubtask':
      return updateSubtasks(tasks, action.id, action.at, (subtasks) =>
        subtasks.filter((subtask) => subtask.id !== action.subtaskId),
      )
  }
}
